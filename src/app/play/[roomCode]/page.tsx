"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores } from "@/lib/game-logic";
import PlayerJoin from "@/components/player/PlayerJoin";
import PlayerWaiting from "@/components/player/PlayerWaiting";
import PlayerAllocation from "@/components/player/PlayerAllocation";
import PlayerEvents from "@/components/player/PlayerEvents";
import PlayerFinal from "@/components/player/PlayerFinal";

interface Game {
  id: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string; effects: Record<string, number> }>;
  round_phase: string | null;
}

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState(1);
  const [score, setScore] = useState(100);
  const [previousScore, setPreviousScore] = useState(100);
  const scoreRef = useRef(100);
  const [lockedIn, setLockedIn] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, number>>({
    rd: 0, security: 0, compatibility: 0, marketing: 0, partnerships: 0,
  });
  const [teamRank, setTeamRank] = useState<number | null>(null);
  const [playerRankInTeam, setPlayerRankInTeam] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}`);
    if (res.ok) {
      const data = await res.json();
      setGame(data);
    } else {
      setError("Game not found");
    }
  }, [roomCode]);

  const fetchPlayerScore = useCallback(async () => {
    if (!playerId || !game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single<{ score: number }>();
    if (data) {
      setPreviousScore(scoreRef.current);
      setScore(data.score);
      scoreRef.current = data.score;
    }
  }, [playerId, game?.id]);

  const fetchRanks = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, team, score")
      .eq("game_id", game.id)
      .order("score", { ascending: false })
      .returns<Array<{ id: string; team: number; score: number }>>();

    if (allPlayers) {
      const teamScores = calculateTeamScores(allPlayers);
      const myTeamIndex = teamScores.findIndex((t) => t.team === playerTeam);
      setTeamRank(myTeamIndex >= 0 ? myTeamIndex + 1 : null);

      const myTeamPlayers = allPlayers
        .filter((p) => p.team === playerTeam)
        .sort((a, b) => b.score - a.score);
      const myIndex = myTeamPlayers.findIndex((p) => p.id === playerId);
      setPlayerRankInTeam(myIndex >= 0 ? myIndex + 1 : null);
    }
  }, [game?.id, playerTeam, playerId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`player-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          setGame((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        (payload) => {
          const newData = payload.new as {
            score: number;
            locked_in: boolean;
            allocations: Record<string, number>;
          };
          setPreviousScore(scoreRef.current);
          setScore(newData.score);
          scoreRef.current = newData.score;
          setLockedIn(newData.locked_in);
          if (newData.allocations) setAllocations(newData.allocations);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, playerId]);

  useEffect(() => {
    if (game?.status === "playing" || game?.status === "finished") {
      fetchPlayerScore();
      fetchRanks();
    }
  }, [game?.status, game?.current_event_index, fetchPlayerScore, fetchRanks]);

  function handleJoined(id: string, name: string, team: number) {
    setPlayerId(id);
    setPlayerName(name);
    setPlayerTeam(team);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!playerId) {
    return <PlayerJoin roomCode={roomCode} onJoined={handleJoined} />;
  }

  if (game.status === "lobby") {
    return <PlayerWaiting name={playerName} team={playerTeam} />;
  }

  if (game.status === "allocating") {
    return (
      <PlayerAllocation
        roomCode={roomCode}
        playerId={playerId}
        lockedIn={lockedIn}
        onLockedIn={() => setLockedIn(true)}
      />
    );
  }

  if (game.status === "playing") {
    const currentEvent =
      game.current_event_index >= 0
        ? game.event_deck[game.current_event_index]
        : null;

    return (
      <PlayerEvents
        currentEvent={currentEvent}
        score={score}
        previousScore={previousScore}
        eventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        teamRank={teamRank}
        roomCode={roomCode}
        playerId={playerId}
        currentAllocations={allocations}
        roundPhase={game.round_phase}
        lockedIn={lockedIn}
      />
    );
  }

  if (game.status === "finished") {
    return (
      <PlayerFinal
        name={playerName}
        team={playerTeam}
        score={score}
        teamRank={teamRank}
        playerRankInTeam={playerRankInTeam}
      />
    );
  }

  return null;
}
