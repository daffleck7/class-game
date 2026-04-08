"use client";

import { useState } from "react";
import AllocationSliders from "@/components/AllocationSliders";

interface GameEvent {
  title: string;
  description: string;
}

interface PlayerEventsProps {
  currentEvent: GameEvent | null;
  score: number;
  previousScore: number;
  eventIndex: number;
  totalEvents: number;
  teamRank: number | null;
  roomCode: string;
  playerId: string;
  currentAllocations: Record<string, number>;
}

export default function PlayerEvents({
  currentEvent,
  score,
  previousScore,
  eventIndex,
  totalEvents,
  teamRank,
  roomCode,
  playerId,
  currentAllocations,
}: PlayerEventsProps) {
  const roundDelta = score - previousScore;
  const [showRealloc, setShowRealloc] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleRealloc(allocations: Record<string, number>) {
    setSaving(true);
    const res = await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations }),
    });
    if (res.ok) {
      setShowRealloc(false);
    }
    setSaving(false);
  }

  if (showRealloc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-bold mb-2">Re-allocate Budget</h2>
        <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
          Shift your investments before the next event hits. Your current score stays the same.
        </p>
        <AllocationSliders
          onLockIn={handleRealloc}
          disabled={saving}
          initialAllocations={currentAllocations}
          buttonLabel={saving ? "Saving..." : "Confirm New Allocation"}
        />
        <button
          onClick={() => setShowRealloc(false)}
          className="mt-4 text-gray-400 hover:text-gray-300 text-sm underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Event {eventIndex + 1} of {totalEvents}
      </p>

      {currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mb-6">
          <h2 className="text-2xl font-bold mb-2">{currentEvent.title}</h2>
          <p className="text-gray-300">{currentEvent.description}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-gray-400">Your Wallet</p>
        <p className="text-5xl font-bold">${score}</p>
        {roundDelta !== 0 && (
          <p
            className={`text-xl font-semibold ${
              roundDelta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {roundDelta > 0 ? "+" : ""}${roundDelta}
          </p>
        )}
        {teamRank !== null && (
          <p className="text-gray-500 text-sm mt-2">Your team is #{teamRank}</p>
        )}
      </div>

      <button
        onClick={() => setShowRealloc(true)}
        className="mt-8 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
      >
        Re-allocate Investments
      </button>
    </div>
  );
}
