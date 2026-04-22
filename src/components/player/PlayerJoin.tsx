"use client";

import { useState } from "react";
import { TEAMS, TEAM_NAMES } from "@/lib/teams";

interface PlayerJoinProps {
  roomCode: string;
  onJoined: (playerId: string, name: string, team: number) => void;
}

export default function PlayerJoin({ roomCode, onJoined }: PlayerJoinProps) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/games/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onJoined(data.player_id, data.name, data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-texture gap-6">
      <div className="text-center">
        <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-2">Welcome to</p>
        <h1 className="text-3xl font-bold mb-1 font-display">Market Mayhem</h1>
        <p className="font-display-italic text-cream-400 text-sm">The Classroom Auction House</p>
        <div className="divider-ornate mt-3 max-w-[200px] mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
        <p className="text-cream-400 text-sm mt-2">Room: <span className="text-cream-100 font-bold font-mono">{roomCode}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="card-ornate w-full max-w-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-cream-400 mb-1 tracking-wider uppercase">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="input-auction w-full rounded-lg py-3 px-4 text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cream-400 mb-1 tracking-wider uppercase">Choose Your Team</label>
          <select
            value={team}
            onChange={(e) => setTeam(parseInt(e.target.value))}
            className="input-auction w-full rounded-lg py-3 px-4 text-lg"
          >
            {TEAMS.map((t) => (
              <option key={t} value={t}>{TEAM_NAMES[t]}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn-gold w-full py-3 px-6 rounded-lg text-lg"
        >
          {loading ? "Joining..." : "Join Game"}
        </button>

        {error && <p className="text-wine-600 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}
