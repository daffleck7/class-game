"use client";

import { TEAM_NAMES } from "@/lib/teams";

interface Player {
  name: string;
  score: number;
  team: number;
}

interface PlayerMVPsProps {
  mvp: Player | null;
  teamMvps: Record<number, { name: string; score: number }>;
}

export default function PlayerMVPs({ mvp, teamMvps }: PlayerMVPsProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {mvp && (
        <div className="text-center bg-yellow-900/20 border border-yellow-700 rounded-xl p-6">
          <p className="text-sm text-yellow-500 uppercase tracking-wider font-semibold">
            Overall MVP
          </p>
          <p className="text-3xl font-bold mt-2">{mvp.name}</p>
          <p className="text-yellow-400 text-xl mt-1">${mvp.score}</p>
          <p className="text-gray-400 text-sm mt-1">{TEAM_NAMES[mvp.team]}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-3 text-center">
          Top Scorer Per Team
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(teamMvps).map(([teamStr, player]) => {
            const team = parseInt(teamStr);
            return (
              <div
                key={team}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-xs text-gray-500">{TEAM_NAMES[team]}</p>
                  <p className="font-semibold">{player.name}</p>
                </div>
                <span className="text-emerald-400 font-bold">${player.score}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
