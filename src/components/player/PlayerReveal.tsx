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
        won ? "reveal-in" : "reveal-out"
      }`}
    >
      <div className="text-center">
        <h2 className="text-lg text-cream-200/80 font-semibold font-display">
          {PHASE_LABELS[phase]} — Round {round + 1}
        </h2>
      </div>

      <div className="text-center">
        <p
          className="text-8xl font-bold mb-4 font-display"
          style={{ textShadow: won ? "0 0 40px rgba(212, 168, 67, 0.6)" : "0 0 40px rgba(114, 47, 55, 0.8)" }}
        >
          {won ? "IN" : "OUT"}
        </p>
        <p className="text-2xl text-cream-100/90 font-display-italic">
          {won ? "Sold — you're in the buying zone!" : "Passed — out of the buying zone"}
        </p>
      </div>

      <div className="divider-ornate max-w-[200px] mx-auto">
        <span className="text-gold-500 text-xs">◆</span>
      </div>

      <div className="text-center text-cream-200/80">
        <p className="text-lg">Your bid: <span className="text-cream-100 font-bold">${bid}</span></p>
      </div>

      {isFinalRound && (
        <div className="card-framed p-6 text-center">
          <p className="text-cream-200/80 text-sm mb-1 tracking-widest uppercase">Your surplus this phase</p>
          <p className={`text-4xl font-bold ${surplus >= 0 ? "text-gold-400" : "text-wine-600"}`}>
            ${surplus}
          </p>
          <p className="text-cream-300/60 text-sm mt-3">Running total: ${totalSurplus}</p>
        </div>
      )}

      <p className="text-cream-300/60 text-sm font-display-italic">Waiting for host to continue...</p>
    </div>
  );
}
