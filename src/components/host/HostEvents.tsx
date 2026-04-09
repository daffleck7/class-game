"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TeamLeaderboard from "@/components/TeamLeaderboard";
import type { TeamScore } from "@/lib/game-logic";

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

interface HostEventsProps {
  currentEventIndex: number;
  totalEvents: number;
  currentEvent: GameEvent | null;
  teamScores: TeamScore[];
  roundPhase: string | null;
  players: Array<{ id: string; name: string; locked_in: boolean }>;
  onAdvance: (action: string) => Promise<void>;
}

function EventEffects({ effects }: { effects: Record<string, number> }) {
  const nonZero = Object.entries(effects).filter(([, val]) => val !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {nonZero.map(([cat, val]) => (
        <span
          key={cat}
          className={`text-sm px-2 py-1 rounded ${
            val > 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {val > 0 ? "+" : ""}{val}x {CATEGORY_LABELS[cat] ?? cat}
        </span>
      ))}
    </div>
  );
}

export default function HostEvents({
  currentEventIndex,
  totalEvents,
  currentEvent,
  teamScores,
  roundPhase,
  players,
  onAdvance,
}: HostEventsProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const advancingRef = useRef(false);

  const fireEventWithCountdown = useCallback(() => {
    setCountdown(3);
  }, []);

  // Countdown timer — fires event when it reaches 0
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      if (!advancingRef.current) {
        advancingRef.current = true;
        onAdvance("fire_event").finally(() => { advancingRef.current = false; });
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onAdvance]);

  const isLastEvent = currentEventIndex >= totalEvents - 1;
  const lockedIn = players.filter((p) => p.locked_in).length;
  const total = players.length;
  const allLocked = lockedIn === total;

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

  // Revealing phase: show event + button for reallocation or finish
  if (roundPhase === "revealing" && currentEvent) {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center animate-fade-in">
          <h2 className="text-3xl font-bold mb-3">{currentEvent.title}</h2>
          <p className="text-gray-300 text-lg">{currentEvent.description}</p>
          <EventEffects effects={currentEvent.effects} />
        </div>
        <TeamLeaderboard teamScores={teamScores} />
        <button
          onClick={() => onAdvance(isLastEvent ? "finish" : "open_realloc")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
        >
          {isLastEvent ? "Finish Game" : "Open Reallocation"}
        </button>
      </div>
    );
  }

  // Reallocation phase: show lock-in progress + trigger next event button
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          After Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <h2 className="text-2xl font-bold">Players Re-investing...</h2>

        <div className="text-center">
          <p className="text-6xl font-bold">
            <span className="text-emerald-400">{lockedIn}</span>
            <span className="text-gray-600"> / {total}</span>
          </p>
          <p className="text-gray-400 mt-2">locked in</p>
        </div>

        <div className="w-full max-w-md bg-gray-800 rounded-full h-4">
          <div
            className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (lockedIn / total) * 100 : 0}%` }}
          />
        </div>

        <TeamLeaderboard teamScores={teamScores} />

        <button
          onClick={fireEventWithCountdown}
          className={`font-bold text-xl py-4 px-12 rounded-xl transition-colors ${
            allLocked
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
          }`}
        >
          {allLocked
            ? "Trigger Next Event"
            : "Trigger Next Event (skip stragglers)"}
        </button>
      </div>
    );
  }

  // Default: waiting to start (round_phase is null)
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 p-8">
      <h2 className="text-3xl font-bold">
        {currentEventIndex === -1 ? "Ready to Begin!" : `Event ${currentEventIndex + 1} Complete`}
      </h2>
      <p className="text-gray-400 text-lg text-center max-w-md">
        {currentEventIndex === -1
          ? "Trigger the first event when you're ready."
          : "Trigger the next event when you're ready."}
      </p>
      <TeamLeaderboard teamScores={teamScores} />
      <button
        onClick={fireEventWithCountdown}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Trigger Next Event
      </button>
    </div>
  );
}
