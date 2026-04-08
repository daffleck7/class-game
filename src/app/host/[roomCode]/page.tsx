"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores, type TeamScore } from "@/lib/game-logic";
import HostLobby from "@/components/host/HostLobby";
import HostAllocation from "@/components/host/HostAllocation";
import HostEvents from "@/components/host/HostEvents";
import HostFinal from "@/components/host/HostFinal";

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string }>;
  round_phase: string | null;
  round_end_time: string | null;
}

interface Player {
  id: string;
  name: string;
  team: number;
  score: number;
  locked_in: boolean;
}

export default function HostPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [mvp, setMvp] = useState<Player | null>(null);
  const [teamMvps, setTeamMvps] = useState<Record<number, { name: string; score: number }>>({});
  const [error, setError] = useState("");

  const hostToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`host_token_${roomCode}`)
      : null;

  const fetchScores = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}/scores`);
    if (res.ok) {
      const data = await res.json();
      setTeamScores(data.teamScores);
      setMvp(data.mvp);
      setTeamMvps(data.teamMvps);
    }
  }, [roomCode]);

  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}`);
    if (res.ok) {
      const data = await res.json();
      setGame(data);
    } else {
      setError("Game not found");
    }
  }, [roomCode]);

  const fetchPlayers = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("id, name, team, score, locked_in")
      .eq("game_id", game.id)
      .order("created_at");
    if (data) {
      setPlayers(data);
      setTeamScores(calculateTeamScores(data));
    }
  }, [game?.id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayers();
    fetchScores();

    const supabase = getSupabaseBrowser();

    const gameChannel = supabase
      .channel(`game-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          setGame((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` },
        () => {
          fetchPlayers();
          fetchScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [game?.id, fetchPlayers, fetchScores]);

  async function handleAdvance(action?: string) {
    if (!hostToken) {
      setError("Missing host token — are you the host?");
      return;
    }
    const res = await fetch(`/api/games/${roomCode}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken, action }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to advance");
    } else {
      await fetchScores();
    }
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
        <p className="text-gray-400 text-xl">Loading...</p>
      </div>
    );
  }

  if (game.status === "lobby") {
    return <HostLobby roomCode={roomCode} players={players} onStart={() => handleAdvance()} />;
  }

  if (game.status === "allocating") {
    return <HostAllocation players={players} onAdvance={() => handleAdvance()} />;
  }

  if (game.status === "playing") {
    const currentEvent =
      game.current_event_index >= 0
        ? game.event_deck[game.current_event_index]
        : null;

    return (
      <HostEvents
        currentEventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        currentEvent={currentEvent}
        teamScores={teamScores}
        roundPhase={game.round_phase}
        roundEndTime={game.round_end_time}
        onAdvance={handleAdvance}
      />
    );
  }

  if (game.status === "finished") {
    return <HostFinal teamScores={teamScores} mvp={mvp} teamMvps={teamMvps} />;
  }

  return null;
}
