"use client";

import TeamLeaderboard from "@/components/TeamLeaderboard";
import PlayerMVPs from "@/components/PlayerMVPs";
import type { TeamScore } from "@/lib/game-logic";

const PODIUM_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_STYLES = [
  "text-yellow-400 border-yellow-500 bg-yellow-900/20",
  "text-gray-300 border-gray-400 bg-gray-800/40",
  "text-amber-600 border-amber-700 bg-amber-900/20",
];
const PODIUM_SIZES = ["text-5xl", "text-3xl", "text-3xl"];

interface Player {
  name: string;
  score: number;
  team: number;
}

interface HostFinalProps {
  teamScores: TeamScore[];
  mvp: Player | null;
  teamMvps: Record<number, { name: string; score: number }>;
}

export default function HostFinal({ teamScores, mvp, teamMvps }: HostFinalProps) {
  const topThree = teamScores.slice(0, 3);

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Game Over!</h1>

      <div className="flex flex-col sm:flex-row items-end justify-center gap-6 w-full max-w-2xl">
        {topThree.map((ts, index) => (
          <div
            key={ts.team}
            className={`flex flex-col items-center border-2 rounded-xl p-6 ${PODIUM_STYLES[index]} ${
              index === 0 ? "sm:order-2 sm:-mb-0" : index === 1 ? "sm:order-1" : "sm:order-3"
            }`}
            style={{ minWidth: "150px" }}
          >
            <p className="text-sm uppercase tracking-wider font-semibold mb-1">
              {PODIUM_LABELS[index]}
            </p>
            <p className={`${PODIUM_SIZES[index]} font-bold`}>
              Team {ts.team}
            </p>
            <p className="text-gray-400 mt-1">Avg: ${ts.averageScore}</p>
            <p className="text-gray-500 text-sm">{ts.playerCount} players</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-400 mb-4 text-center">Full Rankings</h3>
        <TeamLeaderboard teamScores={teamScores} highlight />
      </div>

      <div className="w-full max-w-2xl">
        <PlayerMVPs mvp={mvp} teamMvps={teamMvps} />
      </div>
    </div>
  );
}
