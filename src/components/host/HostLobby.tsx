"use client";

import QRCode from "@/components/QRCode";
import { TEAMS, TEAM_NAMES, TEAM_BORDER_COLORS } from "@/lib/teams";

interface Player {
  id: string;
  name: string;
  team: number;
}

interface HostLobbyProps {
  roomCode: string;
  players: Player[];
  onStart: () => void;
}

export default function HostLobby({ roomCode, players, onStart }: HostLobbyProps) {
  const playersByTeam = new Map<number, Player[]>();
  for (const player of players) {
    const existing = playersByTeam.get(player.team) || [];
    existing.push(player);
    playersByTeam.set(player.team, existing);
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Market Mayhem</h1>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <QRCode roomCode={roomCode} />
        <div className="text-center">
          <p className="text-gray-400 text-sm">Room Code</p>
          <p className="text-5xl font-mono font-bold tracking-wider">{roomCode}</p>
          <p className="text-gray-400 mt-4">{players.length} player{players.length !== 1 ? "s" : ""} joined</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {TEAMS.map((team) => (
          <div
            key={team}
            className={`border-l-4 ${TEAM_BORDER_COLORS[team]} bg-gray-900 rounded-lg p-4`}
          >
            <h3 className="font-semibold text-sm text-gray-400 mb-2">{TEAM_NAMES[team]}</h3>
            <div className="space-y-1">
              {(playersByTeam.get(team) || []).map((p) => (
                <p key={p.id} className="text-sm">{p.name}</p>
              ))}
              {!(playersByTeam.get(team) || []).length && (
                <p className="text-xs text-gray-600 italic">No players yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={players.length < 2}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Start Game ({players.length} players)
      </button>
    </div>
  );
}
