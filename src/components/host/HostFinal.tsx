"use client";

import TeamLeaderboard from "@/components/TeamLeaderboard";
import PlayerMVPs from "@/components/PlayerMVPs";
import type { TeamScore } from "@/lib/game-logic";

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
  const winner = teamScores.length > 0 ? teamScores[0] : null;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Game Over!</h1>

      {winner && (
        <div className="text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wider">Winner</p>
          <p className="text-5xl font-bold text-yellow-400 mt-2">
            Team {winner.team}
          </p>
          <p className="text-gray-400 mt-1">Average: ${winner.averageScore}</p>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-400 mb-4 text-center">Team Rankings</h3>
        <TeamLeaderboard teamScores={teamScores} highlight />
      </div>

      <div className="w-full max-w-2xl">
        <PlayerMVPs mvp={mvp} teamMvps={teamMvps} />
      </div>
    </div>
  );
}
