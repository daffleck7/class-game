"use client";

import TeamLeaderboard from "@/components/TeamLeaderboard";
import type { TeamScore } from "@/lib/game-logic";

interface GameEvent {
  title: string;
  description: string;
}

interface HostEventsProps {
  currentEventIndex: number;
  totalEvents: number;
  currentEvent: GameEvent | null;
  teamScores: TeamScore[];
  onNextEvent: () => void;
}

export default function HostEvents({
  currentEventIndex,
  totalEvents,
  currentEvent,
  teamScores,
  onNextEvent,
}: HostEventsProps) {
  const isLastEvent = currentEventIndex >= totalEvents - 1;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
      </div>

      {currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center">
          <h2 className="text-3xl font-bold mb-3">{currentEvent.title}</h2>
          <p className="text-gray-300 text-lg">{currentEvent.description}</p>
        </div>
      )}

      {!currentEvent && currentEventIndex === -1 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to Begin!</h2>
          <p className="text-gray-400">Click below to reveal the first event.</p>
        </div>
      )}

      <TeamLeaderboard teamScores={teamScores} />

      <button
        onClick={onNextEvent}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        {currentEventIndex === -1
          ? "Reveal First Event"
          : isLastEvent
            ? "Show Final Results"
            : "Next Event"}
      </button>
    </div>
  );
}
