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
    <div className="flex flex-col items-center p-8 gap-6 bg-texture min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-1 font-display">Market Mayhem</h1>
        <h2 className="text-xl text-gold-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <div className="divider-ornate mt-3 max-w-sm mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {(() => {
          const winners = sortedBids.filter((b) => b.won);
          const lowestWinningBid = winners.length > 0
            ? winners[winners.length - 1].bid
            : null;
          return (
            <div className="card-ornate overflow-hidden">
              {sortedBids.map((bid, index) => (
                <div key={bid.player_id}>
                  {index === supply && (
                    <div className="buy-line">
                      <span className="text-cream-100 text-xs font-semibold uppercase tracking-wider">
                        Buy Line — {supply} units available
                        {!isFinalRound && lowestWinningBid !== null && (
                          <> · Clearing price: <span className="text-xl font-bold align-middle">${lowestWinningBid}</span></>
                        )}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-b border-mahogany-800 ${
                      bid.won ? "bid-row-winner" : "bid-row-loser"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="lot-number">{index + 1}</span>
                      <div className={`w-2 h-6 rounded ${TEAM_COLORS[bid.team]}`} />
                      <span className="font-medium">{bid.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {isFinalRound ? (
                        <>
                          <span className="text-xl font-bold">${bid.bid}</span>
                          {bid.won && (
                            <span className="text-gold-400 text-sm">+${bid.surplus.toFixed(2)} surplus</span>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {sortedBids.length <= supply && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gold-600/30">
                  <span className="text-gold-400 text-xs font-semibold uppercase tracking-wider">
                    All bids win — supply exceeds demand
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {isFinalRound && (() => {
        const winnerCount = sortedBids.filter((b) => b.won).length;
        const avgProducer = winnerCount > 0
          ? (producerSurplus / winnerCount).toFixed(2)
          : "0.00";
        const avgConsumer = winnerCount > 0
          ? (consumerSurplus / winnerCount).toFixed(2)
          : "0.00";
        return (
          <>
            <div className="divider-ornate w-full max-w-2xl">
              <span className="text-gold-500 text-xs">◆</span>
            </div>
            <div className="flex gap-8 text-center">
              <div className="card-framed p-6 min-w-[200px]">
                <p className="text-cream-400 text-sm mb-1 tracking-widest uppercase">
                  Avg Producer Surplus
                </p>
                <p className="text-3xl font-bold text-wine-600">${avgProducer}</p>
                <p className="text-cream-400 text-xs mt-1">per unit sold</p>
              </div>
              <div className="card-framed p-6 min-w-[200px]">
                <p className="text-cream-400 text-sm mb-1 tracking-widest uppercase">
                  Avg Consumer Surplus
                </p>
                <p className="text-3xl font-bold text-gold-400">${avgConsumer}</p>
                <p className="text-cream-400 text-xs mt-1">per buyer</p>
              </div>
            </div>
          </>
        );
      })()}

      <div>
        {!isFinalRound && (
          <button
            onClick={onNextRound}
            className="btn-gold text-xl py-4 px-12 rounded-xl"
          >
            Next Round
          </button>
        )}
        {isFinalRound && !isLastPhase && (
          <button
            onClick={onNextPhase}
            className="btn-gold text-xl py-4 px-12 rounded-xl"
          >
            Next Phase: {PHASE_LABELS[phase + 1]}
          </button>
        )}
        {isFinalRound && isLastPhase && (
          <button
            onClick={onFinish}
            className="btn-gold text-xl py-4 px-12 rounded-xl"
          >
            See Final Results
          </button>
        )}
      </div>
    </div>
  );
}
