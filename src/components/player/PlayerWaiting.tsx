"use client";

import { TEAM_NAMES } from "@/lib/teams";

interface PlayerWaitingProps {
  name: string;
  team: number;
}

export default function PlayerWaiting({ name, team }: PlayerWaitingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="animate-pulse mb-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto" />
      </div>
      <h2 className="text-2xl font-bold mb-2">You're in, {name}!</h2>
      <p className="text-gray-400">{TEAM_NAMES[team]}</p>
      <p className="text-gray-500 mt-4">Waiting for the host to start the game...</p>
    </div>
  );
}
