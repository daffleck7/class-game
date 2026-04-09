"use client";

import AllocationSliders from "@/components/AllocationSliders";

interface PlayerAllocationProps {
  roomCode: string;
  playerId: string;
  lockedIn: boolean;
  onLockedIn: () => void;
}

export default function PlayerAllocation({
  roomCode,
  playerId,
  lockedIn,
  onLockedIn,
}: PlayerAllocationProps) {
  async function handleLockIn(allocations: Record<string, number>) {
    const res = await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations }),
    });
    if (res.ok) {
      onLockedIn();
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-2">Invest Your Budget</h2>
      <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
        You have $100 in cash. Spend it to invest in categories — your investments
        earn returns when events hit. Any cash you don't invest is kept safe and
        counts toward your final score.
      </p>
      <AllocationSliders onLockIn={handleLockIn} disabled={lockedIn} />
      {lockedIn && (
        <p className="text-emerald-400 mt-4">Investments locked in! Waiting for events...</p>
      )}
    </div>
  );
}
