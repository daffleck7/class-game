"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";
import type { TeamScore } from "@/lib/game-logic";
import { TEAM_NAMES, TEAM_COLORS } from "@/lib/teams";

interface PhaseResultBid {
  won: boolean;
}

interface PhaseResult {
  phase: number;
  producer_surplus: number;
  consumer_surplus: number;
  bids: PhaseResultBid[];
}

interface PlayerRanking {
  name: string;
  team: number;
  total_surplus: number;
}

interface HostFinalProps {
  phaseResults: PhaseResult[];
  playerRankings: PlayerRanking[];
  teamScores: TeamScore[];
}

/**
 * Final results screen showing surplus comparison, individual and team leaderboards.
 */
export default function HostFinal({ phaseResults, playerRankings, teamScores }: HostFinalProps) {
  const avgResults = phaseResults.map((r) => {
    const winnerCount = r.bids.filter((b) => b.won).length;
    return {
      phase: r.phase,
      avgProducer: winnerCount > 0 ? r.producer_surplus / winnerCount : 0,
      avgConsumer: winnerCount > 0 ? r.consumer_surplus / winnerCount : 0,
    };
  });

  const maxSurplus = Math.max(
    ...avgResults.flatMap((r) => [r.avgProducer, r.avgConsumer]),
    1
  );

  return (
    <div className="flex flex-col items-center p-8 gap-10 bg-texture min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-display">Market Mayhem — Results</h1>
        <p className="font-display-italic text-cream-400 text-base mt-1">Hammer Falls</p>
        <div className="divider-ornate mt-3 max-w-xs mx-auto">
          <span className="text-gold-500 text-xs">◆</span>
        </div>
      </div>

      {/* Winner Spotlight */}
      <div className="flex gap-8 w-full max-w-3xl justify-center">
        {playerRankings.length > 0 && (
          <div className="card-ornate p-8 text-center flex-1">
            <p className="text-gold-400 text-4xl mb-2">&#x1F3C6;</p>
            <p className="text-cream-400 text-sm tracking-widest uppercase mb-1">Top Bidder</p>
            <p className="text-3xl font-bold font-display text-gold-400">{playerRankings[0].name}</p>
            <div className={`w-4 h-4 rounded-full mx-auto mt-2 ${TEAM_COLORS[playerRankings[0].team]}`} />
            <p className="text-2xl font-bold mt-2">${playerRankings[0].total_surplus.toFixed(2)}</p>
            <p className="text-cream-400 text-xs">total surplus</p>
          </div>
        )}
        {teamScores.length > 0 && (
          <div className="card-ornate p-8 text-center flex-1">
            <p className="text-gold-400 text-4xl mb-2">&#x1F3C6;</p>
            <p className="text-cream-400 text-sm tracking-widest uppercase mb-1">Winning Team</p>
            <p className="text-3xl font-bold font-display text-gold-400">{TEAM_NAMES[teamScores[0].team]}</p>
            <div className={`w-4 h-4 rounded-full mx-auto mt-2 ${TEAM_COLORS[teamScores[0].team]}`} />
            <p className="text-2xl font-bold mt-2">${teamScores[0].averageScore.toFixed(2)} avg</p>
            <p className="text-cream-400 text-xs">{teamScores[0].playerCount} players</p>
          </div>
        )}
      </div>

      <div className="divider-ornate w-full max-w-3xl">
        <span className="text-gold-500 text-xs">◆</span>
      </div>

      {/* Surplus Comparison Chart */}
      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-center tracking-widest uppercase text-cream-400">Avg Surplus per Unit Sold</h2>
        <div className="grid grid-cols-3 gap-6">
          {avgResults.map((result) => (
            <div key={result.phase} className="card-framed p-4 text-center">
              <h3 className="font-semibold text-gold-400 mb-4 font-display">{PHASE_LABELS[result.phase]}</h3>
              <div className="flex justify-center gap-4 items-end h-40">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-wine-600">
                    ${result.avgProducer.toFixed(2)}
                  </span>
                  <div
                    className="w-12 bar-producer"
                    style={{ height: `${(result.avgProducer / maxSurplus) * 120}px` }}
                  />
                  <span className="text-xs text-cream-400">Producer</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-gold-400">
                    ${result.avgConsumer.toFixed(2)}
                  </span>
                  <div
                    className="w-12 bar-consumer"
                    style={{ height: `${(result.avgConsumer / maxSurplus) * 120}px` }}
                  />
                  <span className="text-xs text-cream-400">Consumer</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider-ornate w-full max-w-3xl">
        <span className="text-gold-500 text-xs">◆</span>
      </div>

      {/* Individual Leaderboard */}
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-center tracking-widest uppercase text-cream-400">Individual Leaderboard</h2>
        <div className="card-ornate overflow-hidden">
          {playerRankings.slice(0, 10).map((player, index) => (
            <div
              key={player.name + player.team}
              className={`flex items-center justify-between px-4 py-3 border-b border-mahogany-800 ${
                index === 0 ? "bid-row-winner" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="lot-number">{index + 1}</span>
                {index === 0 && <span className="text-gold-400 text-sm">★</span>}
                <div className={`w-2 h-6 rounded ${TEAM_COLORS[player.team]}`} />
                <span className="font-medium">{player.name}</span>
              </div>
              <span className="text-xl font-bold">${player.total_surplus.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="divider-ornate w-full max-w-lg">
        <span className="text-gold-500 text-xs">◆</span>
      </div>

      {/* Team Leaderboard */}
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-center tracking-widest uppercase text-cream-400">Team Leaderboard</h2>
        <div className="card-ornate overflow-hidden">
          {teamScores.map((ts, index) => (
            <div
              key={ts.team}
              className={`flex items-center justify-between px-4 py-3 border-b border-mahogany-800 ${
                index === 0 ? "bid-row-winner" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="lot-number">{index + 1}</span>
                {index === 0 && <span className="text-gold-400 text-sm">★</span>}
                <div className={`w-3 h-8 rounded ${TEAM_COLORS[ts.team]}`} />
                <div>
                  <span className="font-semibold">{TEAM_NAMES[ts.team]}</span>
                  <span className="text-cream-400 text-sm ml-2">({ts.playerCount} players)</span>
                </div>
              </div>
              <span className="text-xl font-bold">${ts.averageScore.toFixed(2)} avg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
