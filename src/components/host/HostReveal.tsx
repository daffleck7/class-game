"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";
import type { ResolvedBid } from "@/lib/auction-logic";
import { TEAM_COLORS } from "@/lib/teams";

interface HostRevealProps {
  phase: number;
  round: number;
  supply: number;
  sortedBids: ResolvedBid[];
  producerSurplus: number;
  consumerSurplus: number;
  isFinalRound: boolean;
  isLastPhase: boolean;
  onNextRound: () => void;
  onNextPhase: () => void;
  onFinish: () => void;
}

/**
 * Host screen showing revealed bids sorted with buy-line.
 */
export default function HostReveal({
  phase,
  round,
  supply,
  sortedBids,
  producerSurplus,
  consumerSurplus,
  isFinalRound,
  isLastPhase,
  onNextRound,
  onNextPhase,
  onFinish,
}: HostRevealProps) {
  return (
    <div className="flex flex-col items-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-1">Market Mayhem</h1>
        <h2 className="text-xl text-indigo-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {sortedBids.map((bid, index) => (
            <div key={bid.player_id}>
              {index === supply && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/50">
                  <div className="flex-1 h-px bg-red-500" />
                  <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                    Buy Line — {supply} units available
                  </span>
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              )}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 ${
                  bid.won ? "bg-emerald-900/20" : "bg-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-6 text-right text-sm">{index + 1}</span>
                  <div className={`w-2 h-6 rounded ${TEAM_COLORS[bid.team]}`} />
                  <span className="font-medium">{bid.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">${bid.bid}</span>
                  {isFinalRound && bid.won && (
                    <span className="text-emerald-400 text-sm">+${bid.surplus} surplus</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {sortedBids.length <= supply && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30">
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                All bids win — supply exceeds demand
              </span>
            </div>
          )}
        </div>
      </div>

      {isFinalRound && (
        <div className="flex gap-8 text-center">
          <div className="bg-gray-900 rounded-xl p-6 min-w-[200px]">
            <p className="text-gray-400 text-sm mb-1">Producer Surplus</p>
            <p className="text-3xl font-bold text-orange-400">${producerSurplus}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 min-w-[200px]">
            <p className="text-gray-400 text-sm mb-1">Consumer Surplus</p>
            <p className="text-3xl font-bold text-emerald-400">${consumerSurplus}</p>
          </div>
        </div>
      )}

      <div>
        {!isFinalRound && (
          <button
            onClick={onNextRound}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            Next Round
          </button>
        )}
        {isFinalRound && !isLastPhase && (
          <button
            onClick={onNextPhase}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            Next Phase: {PHASE_LABELS[phase + 1]}
          </button>
        )}
        {isFinalRound && isLastPhase && (
          <button
            onClick={onFinish}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            See Final Results
          </button>
        )}
      </div>
    </div>
  );
}
