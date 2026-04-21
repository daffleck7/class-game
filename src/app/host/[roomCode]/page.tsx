"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores, type TeamScore } from "@/lib/game-logic";
import type { ResolvedBid } from "@/lib/auction-logic";
import HostLobby from "@/components/host/HostLobby";
import HostBidding from "@/components/host/HostBidding";
import HostReveal from "@/components/host/HostReveal";
import HostFinal from "@/components/host/HostFinal";

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_phase: number;
  current_round: number;
  round_supply: number;
  phase_results: Array<{
    phase: number;
    producer_surplus: number;
    consumer_surplus: number;
    bids: ResolvedBid[];
  }>;
}

interface Player {
  id: string;
  name: string;
  team: number;
  current_bid: number | null;
  total_surplus: number;
}

interface RevealData {
  result: {
    sorted_bids: ResolvedBid[];
    producer_surplus: number;
    consumer_surplus: number;
  };
}

export default function HostPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [error, setError] = useState("");

  const hostToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`host_token_${roomCode}`)
      : null;

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
      .select("id, name, team, current_bid, total_surplus")
      .eq("game_id", game.id)
      .order("created_at")
      .returns<Player[]>();
    if (data) {
      setPlayers(data);
    }
  }, [game?.id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayers();

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`host-${game.id}`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, fetchPlayers]);

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
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to advance");
    } else {
      if (data.result) {
        setRevealData({ result: data.result });
      }
      if (data.status === "bidding") {
        setRevealData(null);
      }
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

  if (game.status === "bidding") {
    return (
      <HostBidding
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        players={players}
        onReveal={() => handleAdvance("reveal")}
      />
    );
  }

  if (game.status === "revealing" && revealData) {
    const isFinalRound = game.current_round === 2;
    const isLastPhase = game.current_phase === 2;

    return (
      <HostReveal
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        sortedBids={revealData.result.sorted_bids}
        producerSurplus={revealData.result.producer_surplus}
        consumerSurplus={revealData.result.consumer_surplus}
        isFinalRound={isFinalRound}
        isLastPhase={isLastPhase}
        onNextRound={() => handleAdvance("next_round")}
        onNextPhase={() => handleAdvance("next_phase")}
        onFinish={() => handleAdvance("finish")}
      />
    );
  }

  if (game.status === "revealing" && !revealData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400">Bids were revealed but data was lost. Click to re-reveal.</p>
        <button
          onClick={() => handleAdvance("reveal")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl"
        >
          Re-reveal Bids
        </button>
      </div>
    );
  }

  if (game.status === "finished") {
    const teamScores = calculateTeamScores(
      players.map((p) => ({ team: p.team, score: p.total_surplus }))
    );
    const playerRankings = [...players]
      .sort((a, b) => b.total_surplus - a.total_surplus)
      .map((p) => ({ name: p.name, team: p.team, total_surplus: p.total_surplus }));

    return (
      <HostFinal
        phaseResults={game.phase_results}
        playerRankings={playerRankings}
        teamScores={teamScores}
      />
    );
  }

  return null;
}
