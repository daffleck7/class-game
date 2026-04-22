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
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-10 bg-texture">
      <div className="text-center">
        <p className="text-gold-500 text-sm tracking-[0.3em] uppercase mb-3">Welcome to</p>
        <h1 className="text-6xl font-bold font-display">Market Mayhem</h1>
        <p className="font-display-italic text-cream-400 text-lg mt-2">The Classroom Auction House</p>
        <div className="divider-ornate mt-4 max-w-xs mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
        <p className="text-cream-500 text-xs tracking-widest uppercase mt-2">Est. 2026</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-xl">
        <div className="card-framed flex-1 p-6 text-center">
          <h2 className="text-xl font-semibold mb-4 font-display">Host a Game</h2>
          <p className="text-cream-400 text-sm mb-6">
            Create a new game room and display it on the big screen.
          </p>
          <button
            onClick={handleHostGame}
            disabled={loading}
            className="btn-gold w-full py-3 px-6 rounded-lg"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </div>

        <div className="card-framed flex-1 p-6 text-center">
          <h2 className="text-xl font-semibold mb-4 font-display">Join a Game</h2>
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
              className="input-auction w-full rounded-lg py-3 px-4 text-center text-lg font-mono uppercase placeholder-cream-500"
            />
            <button
              type="submit"
              className="btn-gold w-full py-3 px-6 rounded-lg"
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
