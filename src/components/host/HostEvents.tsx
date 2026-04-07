"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(currentEventIndex >= 0);

  useEffect(() => {
    setRevealed(currentEventIndex >= 0 && countdown === null);
  }, [currentEventIndex, countdown]);

  const handleNextEvent = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setRevealed(true);
      onNextEvent();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onNextEvent]);

  if (countdown !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 2} of {totalEvents}
        </p>
        <div className="relative flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-4 border-indigo-500 flex items-center justify-center animate-spin-slow">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 animate-spin" />
          </div>
          <span className="absolute text-7xl font-bold text-indigo-400 animate-pulse">
            {countdown}
          </span>
        </div>
        <p className="text-xl text-gray-400 animate-pulse">Incoming event...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
      </div>

      {currentEvent && revealed && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center animate-fade-in">
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
        onClick={handleNextEvent}
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
