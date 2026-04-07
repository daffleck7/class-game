/**
 * Core game logic for the class-game icebreaker.
 *
 * Provides room code generation, deck shuffling, round scoring,
 * and team leaderboard calculation.
 */

import { ALL_EVENTS, CATEGORIES, type Category, type GameEvent } from "./events";

/**
 * Generates a random 6-character uppercase alphanumeric room code.
 * Excludes visually ambiguous characters (O, I, 0, 1).
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Returns a shuffled subset of 7 unique events drawn from ALL_EVENTS.
 */
export function shuffleDeck(): GameEvent[] {
  const shuffled = [...ALL_EVENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 7);
}

/**
 * Calculates the score for a single round by applying event effect multipliers
 * to each category allocation and summing the results.
 *
 * @param allocations - Player's budget split across categories (totals to 100).
 * @param effects     - Event multipliers per category.
 * @returns           - Rounded integer score for the round.
 */
export function calculateRoundScore(
  allocations: Record<Category, number>,
  effects: Record<Category, number>
): number {
  let total = 0;
  for (const cat of CATEGORIES) {
    total += allocations[cat] * effects[cat];
  }
  return Math.round(total);
}

export interface TeamScore {
  team: number;
  averageScore: number;
  playerCount: number;
}

/**
 * Aggregates individual player scores into team averages and sorts
 * the result by average score descending (highest score first).
 *
 * @param players - Array of player records with team number and wallet score.
 * @returns       - Sorted array of team scores.
 */
export function calculateTeamScores(
  players: Array<{ team: number; score: number }>
): TeamScore[] {
  const teamMap = new Map<number, { total: number; count: number }>();

  for (const player of players) {
    const existing = teamMap.get(player.team);
    if (existing) {
      existing.total += player.score;
      existing.count += 1;
    } else {
      teamMap.set(player.team, { total: player.score, count: 1 });
    }
  }

  const results: TeamScore[] = [];
  for (const [team, data] of teamMap) {
    results.push({
      team,
      averageScore: Math.round(data.total / data.count),
      playerCount: data.count,
    });
  }

  results.sort((a, b) => b.averageScore - a.averageScore);
  return results;
}
