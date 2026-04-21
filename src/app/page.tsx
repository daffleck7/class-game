"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleHostGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/games", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`host_token_${data.room_code}`, data.host_token);
      router.push(`/host/${data.room_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }

  function handleJoinGame(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/play/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2 font-display">Market Mayhem</h1>
        <p className="text-cream-400 text-lg">The classroom auction game</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-xl">
        <div className="flex-1 bg-mahogany-900 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Host a Game</h2>
          <p className="text-cream-400 text-sm mb-6">
            Create a new game room and display it on the big screen.
          </p>
          <button
            onClick={handleHostGame}
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-mahogany-700 text-cream-100 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </div>

        <div className="flex-1 bg-mahogany-900 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Join a Game</h2>
          <p className="text-cream-400 text-sm mb-6">
            Enter the room code shown on screen or scan the QR code.
          </p>
          <form onSubmit={handleJoinGame} className="flex flex-col gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ROOM CODE"
              maxLength={6}
              className="w-full bg-mahogany-800 border border-mahogany-700 rounded-lg py-3 px-4 text-center text-lg font-mono uppercase placeholder-cream-500 focus:outline-none focus:border-gold-500"
            />
            <button
              type="submit"
              className="w-full bg-gold-600 hover:bg-gold-500 text-cream-100 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p className="text-wine-600 text-sm">{error}</p>
      )}
    </main>
  );
}
