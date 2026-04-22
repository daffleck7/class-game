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
    <div className="flex flex-col items-center gap-8 p-8 bg-texture min-h-screen">
      <div className="text-center">
        <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-2">Welcome to</p>
        <h1 className="text-4xl font-bold font-display">Market Mayhem</h1>
        <p className="font-display-italic text-cream-400 text-base mt-1">The Classroom Auction House</p>
        <div className="divider-ornate mt-3 max-w-xs mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
      </div>

      <div className="card-framed flex flex-col sm:flex-row items-center gap-8 p-6">
        <QRCode roomCode={roomCode} />
        <div className="text-center">
          <p className="text-cream-400 text-sm tracking-widest uppercase">Room Code</p>
          <p className="text-5xl font-mono font-bold tracking-wider mt-1">{roomCode}</p>
          <p className="text-cream-400 mt-4">{players.length} player{players.length !== 1 ? "s" : ""} joined</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {TEAMS.map((team) => (
          <div
            key={team}
            className={`card-ornate border-l-4 ${TEAM_BORDER_COLORS[team]} p-4`}
          >
            <h3 className="font-semibold text-sm text-cream-400 mb-2">{TEAM_NAMES[team]}</h3>
            <div className="space-y-1">
              {(playersByTeam.get(team) || []).map((p) => (
                <p key={p.id} className="text-sm">{p.name}</p>
              ))}
              {!(playersByTeam.get(team) || []).length && (
                <p className="text-xs text-mahogany-500 italic">No players yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={players.length < 2}
        className={`btn-gold text-xl py-4 px-12 rounded-xl ${players.length >= 2 ? "animate-pulse-gold" : ""}`}
      >
        Start Game ({players.length} players)
      </button>
    </div>
  );
}
