"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  rd: "R&D",
  security: "Security",
  compatibility: "Compatibility",
  marketing: "Marketing",
  partnerships: "Partnerships",
};

const CATEGORY_COLORS: Record<string, string> = {
  rd: "bg-blue-500",
  security: "bg-red-500",
  compatibility: "bg-green-500",
  marketing: "bg-yellow-500",
  partnerships: "bg-purple-500",
};

interface AllocationSlidersProps {
  onLockIn: (allocations: Record<string, number>) => void;
  disabled: boolean;
  initialAllocations?: Record<string, number>;
  buttonLabel?: string;
  budget?: number;
  autoSubmitAt?: string | null;
}

export default function AllocationSliders({
  onLockIn,
  disabled,
  initialAllocations,
  buttonLabel,
  budget = 100,
  autoSubmitAt,
}: AllocationSlidersProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>(
    initialAllocations ?? {
      rd: 0,
      security: 0,
      compatibility: 0,
      marketing: 0,
      partnerships: 0,
    }
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const allocationsRef = useRef(allocations);
  const submittedRef = useRef(false);

  useEffect(() => {
    allocationsRef.current = allocations;
  }, [allocations]);

  // Reset when initialAllocations change (new round)
  useEffect(() => {
    if (initialAllocations) {
      setAllocations(initialAllocations);
      submittedRef.current = false;
    }
  }, [initialAllocations]);

  const handleAutoSubmit = useCallback(() => {
    if (!submittedRef.current && !disabled) {
      submittedRef.current = true;
      onLockIn(allocationsRef.current);
    }
  }, [onLockIn, disabled]);

  // Countdown timer and auto-submit
  useEffect(() => {
    if (!autoSubmitAt) {
      setTimeLeft(null);
      return;
    }

    const deadline = new Date(autoSubmitAt).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [autoSubmitAt, handleAutoSubmit]);

  const totalInvested = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const wallet = budget - totalInvested;

  function handleChange(category: string, value: number) {
    const otherTotal = totalInvested - allocations[category];
    const maxAllowed = budget - otherTotal;
    const clamped = Math.min(value, maxAllowed);
    setAllocations((prev) => ({ ...prev, [category]: clamped }));
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {timeLeft !== null && (
        <div className="text-center">
          <p className="text-sm text-gray-400">Time remaining</p>
          <p className={`text-3xl font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-indigo-400"}`}>
            {timeLeft}s
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-400">Wallet Balance</p>
        <p className={`text-4xl font-bold ${wallet < budget ? "text-amber-400" : "text-emerald-400"}`}>
          ${wallet}
        </p>
        <p className="text-sm text-gray-500 mt-1">Invested: ${totalInvested}</p>
      </div>

      <div className="space-y-4">
        {Object.keys(CATEGORY_LABELS).map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
              <span className="text-gray-400">${allocations[cat]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={budget}
              value={allocations[cat]}
              onChange={(e) => handleChange(cat, parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-700"
            />
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`${CATEGORY_COLORS[cat]} h-1.5 rounded-full transition-all`}
                style={{ width: `${budget > 0 ? (allocations[cat] / budget) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { submittedRef.current = true; onLockIn(allocations); }}
        disabled={disabled}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {disabled ? "Locked In ✓" : buttonLabel ?? "Lock In Investments"}
      </button>
    </div>
  );
}
