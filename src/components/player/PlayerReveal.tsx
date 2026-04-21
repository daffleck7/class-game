"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";

interface PlayerRevealProps {
  phase: number;
  round: number;
  won: boolean;
  bid: number;
  surplus: number;
  totalSurplus: number;
  isFinalRound: boolean;
}

/**
 * Player screen after bids are revealed.
 * Shows green (in buying zone) or red (out).
 */
export default function PlayerReveal({
  phase,
  round,
  won,
  bid,
  surplus,
  totalSurplus,
  isFinalRound,
}: PlayerRevealProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-6 gap-6 ${
        won ? "bg-emerald-900" : "bg-red-900"
      }`}
    >
      <div className="text-center">
        <h2 className="text-lg text-white/70 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1}
        </h2>
      </div>

      <div className="text-center">
        <p className="text-6xl font-bold mb-4">{won ? "IN" : "OUT"}</p>
        <p className="text-2xl text-white/80">
          {won ? "You're in the buying zone!" : "You're out of the buying zone"}
        </p>
      </div>

      <div className="text-center text-white/70">
        <p className="text-lg">Your bid: <span className="text-white font-bold">${bid}</span></p>
      </div>

      {isFinalRound && (
        <div className="bg-black/20 rounded-xl p-6 text-center">
          <p className="text-white/70 text-sm mb-1">Your surplus this phase</p>
          <p className={`text-4xl font-bold ${surplus >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            ${surplus}
          </p>
          <p className="text-white/50 text-sm mt-3">Running total: ${totalSurplus}</p>
        </div>
      )}

      <p className="text-white/50 text-sm">Waiting for host to continue...</p>
    </div>
  );
}
