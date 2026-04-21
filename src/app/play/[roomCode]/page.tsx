"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores } from "@/lib/game-logic";
import PlayerJoin from "@/components/player/PlayerJoin";
import PlayerBidding from "@/components/player/PlayerBidding";
import PlayerReveal from "@/components/player/PlayerReveal";
import PlayerFinal from "@/components/player/PlayerFinal";

interface Game {
  id: string;
  status: string;
  current_phase: number;
  current_round: number;
  round_supply: number;
  phase_results: Array<{
    phase: number;
    bids: Array<{ player_id: string; won: boolean; surplus: number; bid: number }>;
  }>;
}

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState(1);
  const [currentBid, setCurrentBid] = useState<number | null>(null);
  const [totalSurplus, setTotalSurplus] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [revealInfo, setRevealInfo] = useState<{ won: boolean; bid: number; surplus: number } | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [teamRank, setTeamRank] = useState<number | null>(null);
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

  const fetchPlayerData = useCallback(async () => {
    if (!playerId || !game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("current_bid, total_surplus")
      .eq("id", playerId)
      .single<{ current_bid: number | null; total_surplus: number }>();
    if (data) {
      setCurrentBid(data.current_bid);
      setTotalSurplus(data.total_surplus);
    }
  }, [playerId, game?.id]);

  const fetchPlayerCount = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);
    if (data) setPlayerCount(data.length);
  }, [game?.id]);

  const fetchRevealPosition = useCallback(async () => {
    if (!game?.id || !playerId) return;
    const supabase = getSupabaseBrowser();
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, current_bid")
      .eq("game_id", game.id)
      .returns<Array<{ id: string; current_bid: number | null }>>();

    if (!allPlayers) return;

    const sorted = [...allPlayers].sort((a, b) => (b.current_bid ?? 0) - (a.current_bid ?? 0));
    const myIndex = sorted.findIndex((p) => p.id === playerId);
    const myBid = sorted[myIndex]?.current_bid ?? 0;
    const won = myIndex >= 0 && myIndex < game.round_supply;
    const surplus = won ? 100 - myBid : 0;
    setRevealInfo({ won, bid: myBid, surplus });
  }, [game?.id, game?.round_supply, playerId]);

  const fetchRanks = useCallback(async () => {
    if (!game?.id || !playerId) return;
    const supabase = getSupabaseBrowser();
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, team, total_surplus")
      .eq("game_id", game.id)
      .order("total_surplus", { ascending: false })
      .returns<Array<{ id: string; team: number; total_surplus: number }>>();

    if (!allPlayers) return;

    const myIndex = allPlayers.findIndex((p) => p.id === playerId);
    setRank(myIndex >= 0 ? myIndex + 1 : null);

    const teamScores = calculateTeamScores(
      allPlayers.map((p) => ({ team: p.team, score: p.total_surplus }))
    );
    const myTeamIndex = teamScores.findIndex((t) => t.team === playerTeam);
    setTeamRank(myTeamIndex >= 0 ? myTeamIndex + 1 : null);
  }, [game?.id, playerId, playerTeam]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayerData();
    fetchPlayerCount();

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`player-${game.id}-${playerId}`)
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
          const newData = payload.new as { current_bid: number | null; total_surplus: number };
          setCurrentBid(newData.current_bid);
          setTotalSurplus(newData.total_surplus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, playerId, fetchPlayerData, fetchPlayerCount]);

  // Handle state transitions
  useEffect(() => {
    if (game?.status === "revealing") {
      fetchRevealPosition();
      fetchPlayerData();
    }
    if (game?.status === "bidding") {
      setRevealInfo(null);
      fetchPlayerData();
    }
    if (game?.status === "finished") {
      fetchRanks();
      fetchPlayerData();
    }
  }, [game?.status, game?.current_round, game?.current_phase, fetchRevealPosition, fetchPlayerData, fetchRanks]);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <h1 className="text-3xl font-bold">Market Mayhem</h1>
        <p className="text-gray-400">Welcome, {playerName}! (Team {playerTeam})</p>
        <p className="text-gray-500">Waiting for host to start...</p>
      </div>
    );
  }

  if (game.status === "bidding") {
    return (
      <PlayerBidding
        roomCode={roomCode}
        playerId={playerId}
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        playerCount={playerCount}
        currentBid={currentBid}
        onBidSubmitted={(bid) => setCurrentBid(bid)}
      />
    );
  }

  if (game.status === "revealing") {
    const isFinalRound = game.current_round === 2;

    // For final round, prefer phase_results data
    if (isFinalRound) {
      const latestPhaseResult = game.phase_results?.find(
        (r) => r.phase === game.current_phase
      );
      if (latestPhaseResult) {
        const myBid = latestPhaseResult.bids.find((b) => b.player_id === playerId);
        if (myBid) {
          return (
            <PlayerReveal
              phase={game.current_phase}
              round={game.current_round}
              won={myBid.won}
              bid={myBid.bid}
              surplus={myBid.surplus}
              totalSurplus={totalSurplus}
              isFinalRound={true}
            />
          );
        }
      }
    }

    // For discovery rounds (or fallback), use fetched position
    if (revealInfo) {
      return (
        <PlayerReveal
          phase={game.current_phase}
          round={game.current_round}
          won={revealInfo.won}
          bid={revealInfo.bid}
          surplus={revealInfo.surplus}
          totalSurplus={totalSurplus}
          isFinalRound={isFinalRound}
        />
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading results...</p>
      </div>
    );
  }

  if (game.status === "finished") {
    return (
      <PlayerFinal
        name={playerName}
        team={playerTeam}
        totalSurplus={totalSurplus}
        rank={rank}
        teamRank={teamRank}
      />
    );
  }

  return null;
}
