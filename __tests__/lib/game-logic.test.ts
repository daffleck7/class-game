import { describe, it, expect } from "vitest";
import { generateRoomCode, calculateTeamScores } from "@/lib/game-logic";

describe("generateRoomCode", () => {
  it("returns a 6-character uppercase alphanumeric string", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(15);
  });
});

describe("calculateTeamScores", () => {
  it("returns average score per team sorted descending", () => {
    const players = [
      { team: 1, score: 150 },
      { team: 1, score: 100 },
      { team: 2, score: 200 },
      { team: 2, score: 180 },
      { team: 2, score: 160 },
    ];
    const result = calculateTeamScores(players);
    expect(result).toEqual([
      { team: 2, averageScore: 180, playerCount: 3 },
      { team: 1, averageScore: 125, playerCount: 2 },
    ]);
  });

  it("returns empty array for no players", () => {
    expect(calculateTeamScores([])).toEqual([]);
  });
});
