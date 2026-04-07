"use client";

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
}

export default function PlayerEvents({
  currentEvent,
  score,
  previousScore,
  eventIndex,
  totalEvents,
  teamRank,
}: PlayerEventsProps) {
  const roundDelta = score - previousScore;

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
    </div>
  );
}
