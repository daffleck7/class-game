"use client";

import { useState } from "react";
import { PHASE_LABELS, PHASE_DESCRIPTIONS } from "@/lib/auction-logic";

interface PlayerBiddingProps {
  roomCode: string;
  playerId: string;
  phase: number;
  round: number;
  supply: number;
  playerCount: number;
  currentBid: number | null;
  onBidSubmitted: (bid: number) => void;
}

/**
 * Player sealed-bid input screen.
 */
export default function PlayerBidding({
  roomCode,
  playerId,
  phase,
  round,
  supply,
  playerCount,
  currentBid,
  onBidSubmitted,
}: PlayerBiddingProps) {
  const [bidInput, setBidInput] = useState(currentBid?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const bidValue = parseFloat(bidInput);
  const isValidBid = !isNaN(bidValue) && bidValue >= 0;
  const surplusPreview = isValidBid ? Math.round((100 - bidValue) * 100) / 100 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidBid) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/games/${roomCode}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, bid: bidValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onBidSubmitted(bidValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 bg-texture">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1 font-display">Market Mayhem</h1>
        <h2 className="text-lg text-gold-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <div className="divider-ornate mt-2 max-w-[200px] mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
        <p className="text-cream-400 text-sm mt-2">
          {supply} units available for {playerCount} players
        </p>
        {round === 0 && (
          <p className="text-cream-500 text-xs mt-1">{PHASE_DESCRIPTIONS[phase]}</p>
        )}
        {round === 2 && (
          <p className="text-gold-400 text-xs mt-1 font-semibold">Final round — this bid counts!</p>
        )}
        {currentBid !== null && round > 0 && (
          <p className="text-cream-400 text-xs mt-2">
            Your bid from last round (${currentBid}) is locked in — update it or sit tight.
          </p>
        )}
      </div>

      <div className="lot-number-placard flex items-center gap-3 bg-mahogany-800 border border-gold-600 rounded px-4 py-2">
        <span className="text-gold-500 text-xs tracking-widest uppercase">Your Valuation</span>
        <span className="text-cream-100 font-bold text-lg font-mono">$100</span>
      </div>

      <form onSubmit={handleSubmit} className="card-framed w-full max-w-xs p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-cream-400 mb-1 tracking-wider uppercase">Your Bid ($)</label>
          <input
            type="number"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder="Enter bid"
            min="0"
            step="0.01"
            className="input-auction w-full rounded-lg py-4 px-4 text-center text-3xl font-mono"
          />
        </div>

        {surplusPreview !== null && (
          <div className={`text-center text-lg font-semibold ${surplusPreview >= 0 ? "text-gold-400" : "text-wine-600"}`}>
            Consumer surplus if you win: ${surplusPreview}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !isValidBid}
          className="btn-gold w-full py-4 px-6 rounded-lg text-lg"
        >
          {submitting ? "Submitting..." : currentBid ? `Update Bid (was $${currentBid})` : "Submit Bid"}
        </button>

        {error && <p className="text-wine-600 text-sm text-center">{error}</p>}
      </form>

      {currentBid && (
        <p className="text-cream-400 text-sm">
          Current bid: <span className="text-cream-100 font-bold">${currentBid}</span>
        </p>
      )}
    </div>
  );
}
