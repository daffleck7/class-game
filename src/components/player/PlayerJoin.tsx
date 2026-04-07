"use client";

import { useState } from "react";

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-2">Budget Blitz</h1>
      <p className="text-gray-400 mb-8">Room: {roomCode}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Choose Your Team</label>
          <select
            value={team}
            onChange={(e) => setTeam(parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-lg focus:outline-none focus:border-indigo-500"
          >
            <option value={1}>Team 1</option>
            <option value={2}>Team 2</option>
            <option value={3}>Team 3</option>
            <option value={4}>Team 4</option>
            <option value={5}>Team 5</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? "Joining..." : "Join Game"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}
