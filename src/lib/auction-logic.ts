/**
 * Auction logic for Market Mayhem.
 *
 * Provides phase configuration, supply calculation, and bid resolution
 * for each auction round. The unit value is fixed at $100 — players
 * earn surplus equal to (100 - their winning bid).
 */

/** Display labels for each market phase (index maps to phase number). */
export const PHASE_LABELS = ["Monopoly", "Oligopoly", "Perfect Competition"] as const;

/**
 * Supply ratios relative to player count for each phase.
 * Multiply by player count and round to get unit supply.
 */
export const PHASE_SUPPLY_RATIOS = [0.33, 0.83, 1.2] as const;

/**
 * Calculate the number of units available in a given phase.
 *
 * @param phase - Phase index (0 = Monopoly, 1 = Oligopoly, 2 = Perfect Competition).
 * @param playerCount - Total number of active players.
 * @returns Number of units supplied, always at least 1.
 */
export function calculateSupply(phase: number, playerCount: number): number {
  return Math.max(1, Math.round(playerCount * PHASE_SUPPLY_RATIOS[phase]));
}

/** Input shape for a single player's bid in an auction round. */
export interface BidInput {
  player_id: string;
  name: string;
  team: number;
  bid: number;
}

/** A bid after round resolution, enriched with win/surplus outcome. */
export interface ResolvedBid {
  player_id: string;
  name: string;
  team: number;
  bid: number;
  /** Whether this player won a unit in the round. */
  won: boolean;
  /** Consumer surplus: (100 - bid) for winners, 0 for losers. */
  surplus: number;
}

/** Aggregated result of a resolved auction round. */
export interface RoundResult {
  /** All bids sorted highest to lowest. */
  sorted_bids: ResolvedBid[];
  /** Sum of all winning bids (seller / producer revenue). */
  producer_surplus: number;
  /** Sum of winner surpluses (100 - bid) across all winning players. */
  consumer_surplus: number;
}

/**
 * Resolve a single auction round given a list of bids and a supply limit.
 *
 * Bids are sorted highest to lowest. The top `supply` bids win a unit.
 * Winners receive a surplus of (100 - bid); losers receive 0.
 * Producer surplus equals the sum of winning bids.
 * Consumer surplus equals the sum of winner surpluses.
 *
 * @param bids - Array of player bids for this round.
 * @param supply - Number of units available (winners allowed).
 * @returns A RoundResult containing sorted resolved bids and surplus totals.
 */
export function resolveRound(bids: BidInput[], supply: number): RoundResult {
  const sorted_bids: ResolvedBid[] = [...bids]
    .sort((a, b) => b.bid - a.bid)
    .map((bid, index) => {
      const won = index < supply;
      const surplus = won ? 100 - bid.bid : 0;
      return { ...bid, won, surplus };
    });

  const winners = sorted_bids.filter((bid) => bid.won);
  const producer_surplus = winners.reduce((total, bid) => total + bid.bid, 0);
  const consumer_surplus = winners.reduce((total, bid) => total + bid.surplus, 0);

  return { sorted_bids, producer_surplus, consumer_surplus };
}
