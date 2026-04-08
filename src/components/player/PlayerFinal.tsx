"use client";

import { TEAM_NAMES } from "@/lib/teams";

interface PlayerFinalProps {
  name: string;
  team: number;
  score: number;
  teamRank: number | null;
  playerRankInTeam: number | null;
}

export default function PlayerFinal({
  name,
  team,
  score,
  teamRank,
  playerRankInTeam,
}: PlayerFinalProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-3xl font-bold mb-6">Game Over!</h1>

      <div className="bg-gray-900 rounded-xl p-8 max-w-sm w-full space-y-4">
        <p className="text-gray-400">{name}</p>
        <p className="text-sm text-gray-500">{TEAM_NAMES[team]}</p>

        <div>
          <p className="text-sm text-gray-400">Final Wallet</p>
          <p className="text-5xl font-bold text-emerald-400">${score}</p>
        </div>

        {teamRank !== null && (
          <div>
            <p className="text-sm text-gray-400">Team Rank</p>
            <p className="text-2xl font-bold">#{teamRank}</p>
          </div>
        )}

        {playerRankInTeam !== null && (
          <div>
            <p className="text-sm text-gray-400">Your Rank in Team</p>
            <p className="text-2xl font-bold">#{playerRankInTeam}</p>
          </div>
        )}
      </div>
    </div>
  );
}
