"use client";

import type { TeamScore } from "@/lib/game-logic";

const TEAM_COLORS = [
  "bg-red-600",
  "bg-blue-600",
  "bg-green-600",
  "bg-yellow-600",
  "bg-purple-600",
];

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];

interface TeamLeaderboardProps {
  teamScores: TeamScore[];
  highlight?: boolean;
}

export default function TeamLeaderboard({ teamScores, highlight }: TeamLeaderboardProps) {
  if (teamScores.length === 0) {
    return <p className="text-gray-500 text-center">No teams yet</p>;
  }

  const maxScore = Math.max(...teamScores.map((t) => t.averageScore), 1);

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {teamScores.map((ts, index) => (
        <div
          key={ts.team}
          className={`flex items-center gap-3 p-3 rounded-lg ${
            highlight && index === 0 ? "bg-yellow-900/30 ring-2 ring-yellow-500" : "bg-gray-900"
          }`}
        >
          <span className="text-2xl font-bold text-gray-500 w-8">#{index + 1}</span>
          <div
            className={`w-3 h-10 rounded ${TEAM_COLORS[ts.team - 1]}`}
          />
          <div className="flex-1">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">{TEAM_NAMES[ts.team - 1]}</span>
              <span className="text-sm text-gray-400">{ts.playerCount} players</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
              <div
                className={`${TEAM_COLORS[ts.team - 1]} h-2 rounded-full transition-all duration-700`}
                style={{ width: `${Math.max((ts.averageScore / maxScore) * 100, 2)}%` }}
              />
            </div>
          </div>
          <span className="text-xl font-bold w-16 text-right">${ts.averageScore}</span>
        </div>
      ))}
    </div>
  );
}
