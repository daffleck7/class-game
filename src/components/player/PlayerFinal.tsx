"use client";

interface PlayerFinalProps {
  name: string;
  team: number;
  totalSurplus: number;
  rank: number | null;
  teamRank: number | null;
}

/**
 * Player final results screen.
 */
export default function PlayerFinal({
  name,
  team,
  totalSurplus,
  rank,
  teamRank,
}: PlayerFinalProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 bg-texture">
      <div className="text-center">
        <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-2">Hammer Falls</p>
        <h1 className="text-3xl font-bold font-display">Market Mayhem</h1>
        <p className="font-display-italic text-cream-400 text-base mt-1">Game Over!</p>
        <div className="divider-ornate mt-3 max-w-[200px] mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
      </div>

      <div className="card-framed p-8 text-center min-w-[280px]">
        <p className="text-cream-400 text-sm mb-1 tracking-wider uppercase">{name} — Team {team}</p>
        <p className="text-5xl font-bold mt-2">${totalSurplus.toFixed(2)}</p>
        <p className="text-cream-400 text-sm mt-1">Total Consumer Surplus</p>
      </div>

      <div className="flex gap-6">
        {rank !== null && (
          <div className="card-ornate p-6 text-center">
            <p className="text-cream-400 text-sm mb-1 tracking-wider uppercase">Your Rank</p>
            <p className="text-3xl font-bold">
              {rank === 1 && <span className="text-gold-400">★ </span>}
              #{rank}
            </p>
          </div>
        )}
        {teamRank !== null && (
          <div className="card-ornate p-6 text-center">
            <p className="text-cream-400 text-sm mb-1 tracking-wider uppercase">Team Rank</p>
            <p className="text-3xl font-bold">
              {teamRank === 1 && <span className="text-gold-400">★ </span>}
              #{teamRank}
            </p>
          </div>
        )}
      </div>

      <p className="text-cream-500 text-sm font-display-italic">Check the big screen for full results!</p>
    </div>
  );
}
