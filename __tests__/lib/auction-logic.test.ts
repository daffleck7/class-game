import { describe, it, expect } from "vitest";
import {
  PHASE_LABELS,
  PHASE_SUPPLY_RATIOS,
  calculateSupply,
  resolveRound,
} from "@/lib/auction-logic";
import type { BidInput } from "@/lib/auction-logic";

// ---------------------------------------------------------------------------
// PHASE_LABELS
// ---------------------------------------------------------------------------

describe("PHASE_LABELS", () => {
  it("has exactly 3 entries", () => {
    expect(PHASE_LABELS).toHaveLength(3);
  });

  it("contains Monopoly, Oligopoly, Perfect Competition in order", () => {
    expect(PHASE_LABELS[0]).toBe("Monopoly");
    expect(PHASE_LABELS[1]).toBe("Oligopoly");
    expect(PHASE_LABELS[2]).toBe("Perfect Competition");
  });
});

// ---------------------------------------------------------------------------
// calculateSupply
// ---------------------------------------------------------------------------

describe("calculateSupply", () => {
  it("returns ~33% of players for Monopoly (phase 0)", () => {
    // 10 players * 0.33 = 3.3 → rounds to 3
    expect(calculateSupply(0, 10)).toBe(3);
  });

  it("returns ~83% of players for Oligopoly (phase 1)", () => {
    // 10 players * 0.83 = 8.3 → rounds to 8
    expect(calculateSupply(1, 10)).toBe(8);
  });

  it("returns ~120% of players for Perfect Competition (phase 2)", () => {
    // 10 players * 1.2 = 12 → rounds to 12 (supply > players)
    expect(calculateSupply(2, 10)).toBe(12);
  });

  it("rounds to nearest integer", () => {
    // 7 players * 0.33 = 2.31 → rounds to 2
    expect(calculateSupply(0, 7)).toBe(2);
    // 7 players * 0.83 = 5.81 → rounds to 6
    expect(calculateSupply(1, 7)).toBe(6);
  });

  it("returns at least 1 even for very small player counts", () => {
    expect(calculateSupply(0, 1)).toBeGreaterThanOrEqual(1);
    // 1 * 0.33 = 0.33 → Math.round = 0 → Math.max(1,0) = 1
    expect(calculateSupply(0, 1)).toBe(1);
  });

  it("supply exceeds player count for Perfect Competition", () => {
    const players = 5;
    const supply = calculateSupply(2, players);
    expect(supply).toBeGreaterThan(players);
  });
});

// ---------------------------------------------------------------------------
// resolveRound
// ---------------------------------------------------------------------------

describe("resolveRound", () => {
  const makeBid = (player_id: string, bid: number, team = 1): BidInput => ({
    player_id,
    name: `Player ${player_id}`,
    team,
    bid,
  });

  it("sorts bids highest to lowest in sorted_bids", () => {
    const bids: BidInput[] = [makeBid("a", 50), makeBid("b", 90), makeBid("c", 70)];
    const result = resolveRound(bids, 2);
    expect(result.sorted_bids[0].bid).toBe(90);
    expect(result.sorted_bids[1].bid).toBe(70);
    expect(result.sorted_bids[2].bid).toBe(50);
  });

  it("marks top N bids as winners (N = supply)", () => {
    const bids: BidInput[] = [makeBid("a", 50), makeBid("b", 90), makeBid("c", 70)];
    const result = resolveRound(bids, 2);
    expect(result.sorted_bids[0].won).toBe(true);  // bid 90
    expect(result.sorted_bids[1].won).toBe(true);  // bid 70
    expect(result.sorted_bids[2].won).toBe(false); // bid 50
  });

  it("calculates winner surplus as 100 - bid", () => {
    const bids: BidInput[] = [makeBid("a", 80), makeBid("b", 60)];
    const result = resolveRound(bids, 1);
    // Winner: bid 80, surplus = 100 - 80 = 20
    expect(result.sorted_bids[0].surplus).toBe(20);
    // Loser: bid 60, surplus = 0
    expect(result.sorted_bids[1].surplus).toBe(0);
  });

  it("calculates producer_surplus as sum of winning bids", () => {
    const bids: BidInput[] = [makeBid("a", 80), makeBid("b", 60), makeBid("c", 40)];
    const result = resolveRound(bids, 2);
    // Winners: 80 + 60 = 140
    expect(result.producer_surplus).toBe(140);
  });

  it("calculates consumer_surplus as sum of winner surpluses", () => {
    const bids: BidInput[] = [makeBid("a", 80), makeBid("b", 60), makeBid("c", 40)];
    const result = resolveRound(bids, 2);
    // (100-80) + (100-60) = 20 + 40 = 60
    expect(result.consumer_surplus).toBe(60);
  });

  it("handles bids over $100 — winner surplus is negative", () => {
    const bids: BidInput[] = [makeBid("a", 120), makeBid("b", 50)];
    const result = resolveRound(bids, 1);
    // Winner bid 120: surplus = 100 - 120 = -20
    expect(result.sorted_bids[0].won).toBe(true);
    expect(result.sorted_bids[0].surplus).toBe(-20);
    expect(result.consumer_surplus).toBe(-20);
    expect(result.producer_surplus).toBe(120);
  });

  it("handles supply greater than number of bidders — all win", () => {
    const bids: BidInput[] = [makeBid("a", 70), makeBid("b", 50)];
    const result = resolveRound(bids, 10);
    expect(result.sorted_bids.every((b) => b.won)).toBe(true);
    expect(result.producer_surplus).toBe(120);
    expect(result.consumer_surplus).toBe(80); // (100-70) + (100-50) = 30 + 50
  });

  it("zero bids lose when supply is limited", () => {
    const bids: BidInput[] = [makeBid("a", 0), makeBid("b", 0), makeBid("c", 50)];
    const result = resolveRound(bids, 1);
    // Only top 1 wins; 50 wins, the two 0-bids lose
    const winner = result.sorted_bids.find((b) => b.player_id === "c");
    expect(winner?.won).toBe(true);
    const loserA = result.sorted_bids.find((b) => b.player_id === "a");
    const loserB = result.sorted_bids.find((b) => b.player_id === "b");
    expect(loserA?.won).toBe(false);
    expect(loserB?.won).toBe(false);
  });

  it("returns all required fields on each ResolvedBid", () => {
    const bids: BidInput[] = [makeBid("x", 75, 2)];
    const result = resolveRound(bids, 1);
    const bid = result.sorted_bids[0];
    expect(bid).toHaveProperty("player_id", "x");
    expect(bid).toHaveProperty("name", "Player x");
    expect(bid).toHaveProperty("team", 2);
    expect(bid).toHaveProperty("bid", 75);
    expect(bid).toHaveProperty("won");
    expect(bid).toHaveProperty("surplus");
  });
});
