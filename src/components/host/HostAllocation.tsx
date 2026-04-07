"use client";

interface Player {
  id: string;
  name: string;
  locked_in: boolean;
}

interface HostAllocationProps {
  players: Player[];
  onAdvance: () => void;
}

export default function HostAllocation({ players, onAdvance }: HostAllocationProps) {
  const lockedIn = players.filter((p) => p.locked_in).length;
  const total = players.length;
  const allLocked = lockedIn === total;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-8">
      <h2 className="text-3xl font-bold">Players Are Investing...</h2>

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

      <button
        onClick={onAdvance}
        className={`font-bold text-xl py-4 px-12 rounded-xl transition-colors ${
          allLocked
            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
        }`}
      >
        {allLocked ? "Everyone's In — Start Events!" : "Start Events (skip stragglers)"}
      </button>
    </div>
  );
}
