"use client";

import { useState } from "react";
import { PHASE_LABELS } from "@/lib/auction-logic";

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

  const bidValue = parseInt(bidInput, 10);
  const isValidBid = !isNaN(bidValue) && bidValue > 0 && Number.isInteger(bidValue);
  const surplusPreview = isValidBid ? 100 - bidValue : null;

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Market Mayhem</h1>
        <h2 className="text-lg text-indigo-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {supply} units available for {playerCount} players
        </p>
        {round < 2 && (
          <p className="text-gray-500 text-xs mt-1">Price discovery round — results revealed after</p>
        )}
        {round === 2 && (
          <p className="text-yellow-400 text-xs mt-1 font-semibold">Final round — this bid counts!</p>
        )}
      </div>

      <div className="text-center text-gray-400 text-sm">
        Your valuation: <span className="text-white font-bold">$100</span>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Your Bid ($)</label>
          <input
            type="number"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder="Enter bid"
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-4 px-4 text-center text-3xl font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        {surplusPreview !== null && (
          <div className={`text-center text-lg font-semibold ${surplusPreview >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            Consumer surplus if you win: ${surplusPreview}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !isValidBid}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          {submitting ? "Submitting..." : currentBid ? `Update Bid (was $${currentBid})` : "Submit Bid"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>

      {currentBid && (
        <p className="text-gray-400 text-sm">
          Current bid: <span className="text-white font-bold">${currentBid}</span>
        </p>
      )}
    </div>
  );
}
