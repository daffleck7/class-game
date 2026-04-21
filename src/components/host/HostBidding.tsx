"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";

interface Player {
  id: string;
  name: string;
  current_bid: number | null;
}

interface HostBiddingProps {
  phase: number;
  round: number;
  supply: number;
  players: Player[];
  onReveal: () => void;
}

/**
 * Host screen during bid collection.
 * Shows phase/round info, supply, and bid submission counter.
 */
export default function HostBidding({ phase, round, supply, players, onReveal }: HostBiddingProps) {
  const bidsIn = players.filter((p) => p.current_bid !== null).length;
  const totalPlayers = players.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 font-display">Market Mayhem</h1>
        <h2 className="text-2xl text-gold-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <p className="text-cream-400 mt-2">
          Supply: <span className="text-cream-100 font-bold">{supply} units</span> for{" "}
          <span className="text-cream-100 font-bold">{totalPlayers} players</span>
        </p>
      </div>

      <div className="bg-mahogany-900 rounded-xl p-8 text-center min-w-[300px]">
        <p className="text-cream-400 text-sm mb-2">Bids Received</p>
        <p className="text-6xl font-bold">
          {bidsIn} <span className="text-3xl text-cream-500">/ {totalPlayers}</span>
        </p>
      </div>

      <button
        onClick={onReveal}
        className="bg-gold-500 hover:bg-gold-400 text-cream-100 font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Reveal Bids
      </button>
    </div>
  );
}
