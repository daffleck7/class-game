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
  roundPhase: string | null;
  roundEndTime: string | null;
  onAdvance: (action: string) => Promise<void>;
}

export default function HostEvents({
  currentEventIndex,
  totalEvents,
  currentEvent,
  teamScores,
  roundPhase,
  roundEndTime,
  onAdvance,
}: HostEventsProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Countdown before firing an event
  const fireEventWithCountdown = useCallback(async () => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onAdvance("fire_event");
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onAdvance]);

  // After event fires (revealing phase), wait 3 seconds then start reallocation
  useEffect(() => {
    if (!autoRunning || roundPhase !== "revealing") return;

    const isLastEvent = currentEventIndex >= totalEvents - 1;

    const timer = setTimeout(() => {
      if (isLastEvent) {
        onAdvance("finish");
      } else {
        onAdvance("start_realloc");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [autoRunning, roundPhase, currentEventIndex, totalEvents, onAdvance]);

  // During reallocation, count down to next event
  useEffect(() => {
    if (roundPhase !== "reallocating" || !roundEndTime) {
      setTimeLeft(null);
      return;
    }

    const deadline = new Date(roundEndTime).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Fire next event after reallocation ends
        fireEventWithCountdown();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [roundPhase, roundEndTime, fireEventWithCountdown]);

  // Start the auto-run loop
  function handleStartEvents() {
    setAutoRunning(true);
    fireEventWithCountdown();
  }

  // Pre-game: waiting to start
  if (!autoRunning && currentEventIndex === -1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 p-8">
        <h2 className="text-3xl font-bold">Ready to Begin!</h2>
        <p className="text-gray-400 text-lg text-center max-w-md">
          Events will auto-advance: 3s reveal, then 20s for players to re-allocate.
        </p>
        <TeamLeaderboard teamScores={teamScores} />
        <button
          onClick={handleStartEvents}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
        >
          Start Events
        </button>
      </div>
    );
  }

  // Countdown animation
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

  // Revealing phase: show event
  if (roundPhase === "revealing" && currentEvent) {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center animate-fade-in">
          <h2 className="text-3xl font-bold mb-3">{currentEvent.title}</h2>
          <p className="text-gray-300 text-lg">{currentEvent.description}</p>
        </div>
        <TeamLeaderboard teamScores={teamScores} />
      </div>
    );
  }

  // Reallocation phase: show timer
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          After Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Players Re-allocating...</h2>
          {timeLeft !== null && (
            <p className={`text-5xl font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-indigo-400"}`}>
              {timeLeft}s
            </p>
          )}
        </div>
        <TeamLeaderboard teamScores={teamScores} />
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <TeamLeaderboard teamScores={teamScores} />
    </div>
  );
}
