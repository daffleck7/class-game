import { describe, it, expect } from "vitest";
import {
  generateRoomCode,
  shuffleDeck,
  calculateRoundScore,
  calculateTeamScores,
} from "@/lib/game-logic";
import { ALL_EVENTS, type Category } from "@/lib/events";

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

describe("shuffleDeck", () => {
  it("returns exactly 7 events", () => {
    const deck = shuffleDeck();
    expect(deck).toHaveLength(7);
  });

  it("only contains events from the full deck", () => {
    const deck = shuffleDeck();
    const allTitles = ALL_EVENTS.map((e) => e.title);
    for (const event of deck) {
      expect(allTitles).toContain(event.title);
    }
  });

  it("does not contain duplicate events", () => {
    const deck = shuffleDeck();
    const titles = deck.map((e) => e.title);
    expect(new Set(titles).size).toBe(7);
  });
});

describe("calculateRoundScore", () => {
  it("applies multipliers to allocations and returns the sum", () => {
    const allocations: Record<Category, number> = {
      rd: 20,
      security: 30,
      compatibility: 10,
      marketing: 25,
      partnerships: 15,
    };
    const effects: Record<Category, number> = {
      rd: 2.0,
      security: -1.0,
      compatibility: 0,
      marketing: 1.5,
      partnerships: 0.5,
    };
    // 20*2 + 30*(-1) + 10*0 + 25*1.5 + 15*0.5 = 40 - 30 + 0 + 37.5 + 7.5 = 55
    expect(calculateRoundScore(allocations, effects)).toBe(55);
  });

  it("returns 0 when all allocations are 0", () => {
    const allocations: Record<Category, number> = {
      rd: 0,
      security: 0,
      compatibility: 0,
      marketing: 0,
      partnerships: 0,
    };
    const effects: Record<Category, number> = {
      rd: 2.5,
      security: 3.0,
      compatibility: 1.0,
      marketing: -1.0,
      partnerships: 0.5,
    };
    expect(calculateRoundScore(allocations, effects)).toBe(0);
  });

  it("handles negative results", () => {
    const allocations: Record<Category, number> = {
      rd: 0,
      security: 0,
      compatibility: 0,
      marketing: 50,
      partnerships: 50,
    };
    const effects: Record<Category, number> = {
      rd: 0,
      security: 0,
      compatibility: 0,
      marketing: -1.5,
      partnerships: -1.0,
    };
    // 50*(-1.5) + 50*(-1.0) = -75 - 50 = -125
    expect(calculateRoundScore(allocations, effects)).toBe(-125);
  });
});

describe("calculateTeamScores", () => {
  it("returns average wallet balance per team", () => {
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

  it("sorts teams by average score descending", () => {
    const players = [
      { team: 1, score: 50 },
      { team: 2, score: 200 },
      { team: 3, score: 150 },
    ];
    const result = calculateTeamScores(players);
    expect(result[0].team).toBe(2);
    expect(result[1].team).toBe(3);
    expect(result[2].team).toBe(1);
  });

  it("returns empty array for no players", () => {
    expect(calculateTeamScores([])).toEqual([]);
  });

  it("rounds average to nearest integer", () => {
    const players = [
      { team: 1, score: 100 },
      { team: 1, score: 101 },
    ];
    const result = calculateTeamScores(players);
    expect(result[0].averageScore).toBe(101);
  });
});
