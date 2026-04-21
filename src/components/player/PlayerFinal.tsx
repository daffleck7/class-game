"use client";

interface PlayerFinalProps {
  name: string;
  team: number;
  totalSurplus: number;
  rank: number | null;
  teamRank: number | null;
}

/**
 * Player final results screen.
 */
export default function PlayerFinal({
  name,
  team,
  totalSurplus,
  rank,
  teamRank,
}: PlayerFinalProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Market Mayhem</h1>
      <h2 className="text-xl text-gray-400">Game Over!</h2>

      <div className="bg-gray-900 rounded-xl p-8 text-center min-w-[280px]">
        <p className="text-gray-400 text-sm mb-1">{name} — Team {team}</p>
        <p className="text-5xl font-bold mt-2">${totalSurplus}</p>
        <p className="text-gray-400 text-sm mt-1">Total Consumer Surplus</p>
      </div>

      <div className="flex gap-6">
        {rank !== null && (
          <div className="bg-gray-900 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Your Rank</p>
            <p className="text-3xl font-bold">#{rank}</p>
          </div>
        )}
        {teamRank !== null && (
          <div className="bg-gray-900 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Team Rank</p>
            <p className="text-3xl font-bold">#{teamRank}</p>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-sm">Check the big screen for full results!</p>
    </div>
  );
}
