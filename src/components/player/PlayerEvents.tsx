"use client";

import { useState } from "react";
import AllocationSliders from "@/components/AllocationSliders";

const CATEGORY_LABELS: Record<string, string> = {
  rd: "R&D",
  security: "Security",
  compatibility: "Compatibility",
  marketing: "Marketing",
  partnerships: "Partnerships",
};

interface GameEvent {
  title: string;
  description: string;
  effects: Record<string, number>;
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
  roundPhase: string | null;
  roundEndTime: string | null;
}

function EventEffects({ effects }: { effects: Record<string, number> }) {
  const nonZero = Object.entries(effects).filter(([, val]) => val !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3">
      {nonZero.map(([cat, val]) => (
        <span
          key={cat}
          className={`text-xs px-2 py-1 rounded ${
            val > 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {val > 0 ? "+" : ""}{val}x {CATEGORY_LABELS[cat] ?? cat}
        </span>
      ))}
    </div>
  );
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
  roundPhase,
  roundEndTime,
}: PlayerEventsProps) {
  const roundDelta = score - previousScore;
  const [confirmed, setConfirmed] = useState(false);

  const totalInvested = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);

  async function handleReinvest(additionalAllocations: Record<string, number>) {
    const res = await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations: additionalAllocations }),
    });
    if (res.ok) {
      setConfirmed(true);
    }
  }

  // Reset confirmed state when phase changes
  if (roundPhase !== "reallocating" && confirmed) {
    setConfirmed(false);
  }

  // Reinvest phase: show current investments + sliders to add from cash
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-bold mb-2">Reinvest</h2>
        <p className="text-gray-400 text-sm mb-4 text-center max-w-sm">
          You have <span className="text-emerald-400 font-bold">${score}</span> cash available.
          Add to your investments before the next event.
        </p>

        {totalInvested > 0 && (
          <div className="w-full max-w-md mb-4 bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Investments</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentAllocations)
                .filter(([, val]) => val > 0)
                .map(([cat, val]) => (
                  <span key={cat} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {CATEGORY_LABELS[cat]}: ${val}
                  </span>
                ))}
            </div>
          </div>
        )}

        <AllocationSliders
          onLockIn={handleReinvest}
          disabled={confirmed}
          budget={score}
          autoSubmitAt={roundEndTime}
          buttonLabel={confirmed ? "Saved ✓" : "Confirm Investments"}
        />
        {confirmed && (
          <p className="text-emerald-400 text-sm mt-3">Investments saved! Waiting for next event...</p>
        )}
      </div>
    );
  }

  // Revealing phase or waiting: show event and score
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Event {eventIndex + 1} of {totalEvents}
      </p>

      {currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mb-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">{currentEvent.title}</h2>
          <p className="text-gray-300">{currentEvent.description}</p>
          <EventEffects effects={currentEvent.effects} />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-gray-400">Cash</p>
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
        {totalInvested > 0 && (
          <p className="text-gray-500 text-sm">Invested: ${totalInvested}</p>
        )}
        {teamRank !== null && (
          <p className="text-gray-500 text-sm mt-2">Your team is #{teamRank}</p>
        )}
      </div>
    </div>
  );
}
