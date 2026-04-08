"use client";

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
  roundPhase: string | null;
  roundEndTime: string | null;
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

  async function handleRealloc(allocations: Record<string, number>) {
    await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations }),
    });
  }

  // Reallocation phase: show sliders with timer
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-bold mb-2">Re-allocate Your Budget</h2>
        <p className="text-gray-400 text-sm mb-4 text-center max-w-sm">
          Shift your investments before the next event. Your wallet is ${score}.
          Anything you don't invest stays as cash.
        </p>
        <AllocationSliders
          onLockIn={handleRealloc}
          disabled={false}
          initialAllocations={currentAllocations}
          budget={score}
          autoSubmitAt={roundEndTime}
          buttonLabel="Confirm Allocation"
        />
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
    </div>
  );
}
