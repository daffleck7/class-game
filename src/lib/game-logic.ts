/**
 * Shared game utilities for Market Mayhem.
 *
 * Provides room code generation and team score aggregation.
 */

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface TeamScore {
  team: number;
  averageScore: number;
  playerCount: number;
}

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
