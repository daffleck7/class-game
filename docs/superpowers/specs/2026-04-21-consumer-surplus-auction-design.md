# Consumer Surplus Auction Game - Design Spec

## Purpose

Demonstrate how increasing competition (more firms/supply) shifts surplus from producers to consumers. Players experience this firsthand through three auction rounds with increasing supply.

## Core Mechanic

- Every player values one unit at exactly **$100**
- Each round, players submit live bids (positive whole dollars, no cap enforced)
- The top N bids win, where N = supply for that round
- **Winners** score consumer surplus: $100 - their bid
- **Losers** score $0 for the round
- **Producer surplus** for each round = sum of all winning bids
- **Consumer surplus** for each round = sum of ($100 - bid) for all winners
- Player with the highest total consumer surplus across all 3 rounds wins individually
- Team with the highest average total consumer surplus wins

## Rounds

Supply is calculated as a percentage of player count (rounded to nearest whole number).

| Round | Label | Supply | Lesson |
|-------|-------|--------|--------|
| 1 | Monopoly | 33% of players | Scarcity drives bids up, large producer surplus |
| 2 | Oligopoly | 83% of players | More supply, bids drop, surplus shifts |
| 3 | Perfect Competition | 120% of players | Everyone wins, bids collapse, max consumer surplus |

## Game Flow

### 1. Lobby

- Host creates a game, gets a 6-character room code
- Players join via room code or QR code
- Players enter their name and choose a team (1, 2, 4, 5, 6)
- Host sees player list and team assignments
- Host clicks "Start Game" to begin Round 1

### 2. Bidding (repeated for each of the 3 rounds)

- Host screen announces the round name (e.g., "Round 1: Monopoly") and supply count
- Players see a bid input on their phone (whole dollars only, must be positive)
- Players can submit and revise their bid as many times as they want
- Host screen shows a live-updating sorted list of all bids (highest to lowest), with player names
- A clear horizontal **buy-line** divides the list: bids above the line are "winning", bids below are "out"
- The buy-line position = supply count for the current round
- Host screen also shows: round name, supply count, "X/Y players have bid"
- Player screen shows live feedback: current bid amount and "Consumer surplus if you win: $X" (calculated as $100 - bid, or negative if bid > $100)
- Host clicks "Close Round" to lock all bids and transition to results

### 3. Round Results

- Host screen shows:
  - List of winners and losers
  - Each winner's bid and consumer surplus
  - Round totals: producer surplus (sum of winning bids) and consumer surplus (sum of $100 - bid for winners)
- Player screen shows:
  - Whether they won or lost
  - Their consumer surplus for this round (or $0 if lost)
  - Their running total consumer surplus
- Host clicks "Next Round" to advance (or "See Final Results" after Round 3)

### 4. Final Results

- **Surplus comparison**: visual showing producer surplus vs consumer surplus across all 3 rounds, demonstrating the shift as competition increases
- **Individual leaderboard**: all players ranked by total consumer surplus across 3 rounds
- **Team leaderboard**: teams ranked by average total consumer surplus of their members

## Player Screen States

| State | What the player sees |
|-------|---------------------|
| Joined / Waiting | "Waiting for host to start..." |
| Bidding | Bid input, current bid, surplus preview, round info |
| Round Results | Win/loss, surplus for round, running total |
| Final | Individual rank, team rank, surplus breakdown |

## Host Screen States

| State | What the host sees |
|-------|-------------------|
| Lobby | Room code, QR code, player list, "Start Game" button |
| Bidding | Round label, supply count, live sorted bid list with buy-line, bid counter, "Close Round" button |
| Round Results | Winners/losers, surplus totals, "Next Round" / "See Final Results" button |
| Final | Surplus comparison across rounds, individual leaderboard, team leaderboard |

## Data Model

Repurpose the existing Supabase tables.

### `games` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| room_code | text | Unique 6-char code |
| status | text | `lobby`, `bidding`, `round_results`, `finished` |
| current_round | int | 0-indexed (0, 1, 2) for the 3 rounds |
| round_supply | int | Calculated supply for current round |
| host_token | text | Auth for host actions |
| round_results | jsonb | Stored results per round: `[{round, producer_surplus, consumer_surplus, winners: [{player_id, bid, surplus}]}]` |
| created_at | timestamptz | Auto |

Removed columns (from old game): `current_event_index`, `event_deck`, `round_phase`, `round_end_time`.

### `players` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| game_id | uuid | FK to games |
| name | text | Player display name |
| team | int | 1, 2, 4, 5, or 6 |
| current_bid | int | Null if no bid placed yet, updated live |
| total_surplus | int | Running total across completed rounds, starts at 0 |
| created_at | timestamptz | Auto |

Removed columns (from old game): `allocations`, `cash`, `score`, `locked_in`.

### Realtime

Both tables remain on the Supabase realtime publication. The host screen subscribes to player bid changes for the live bid list. Player screens subscribe to game status changes to know when rounds end.

## API Routes

Repurpose the existing route structure under `/api/games/[roomCode]/`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/games` | POST | Create a new game |
| `/api/games/[roomCode]` | GET | Get game state |
| `/api/games/[roomCode]/join` | POST | Join a game (name + team) |
| `/api/games/[roomCode]/bid` | POST | Submit/update a bid |
| `/api/games/[roomCode]/advance` | POST | Host: start game, close round, next round, finish |

Removed routes: `/allocate`, `/scores` (no longer needed).

## Tech Stack (unchanged)

- Next.js 16 + React 19
- Supabase (Postgres + Realtime)
- Tailwind CSS
- Deployed on Vercel
- Vitest for tests

## Supply Calculation

```
player_count = number of players in the game
round_supply = {
  0: Math.round(player_count * 0.33),   // Monopoly
  1: Math.round(player_count * 0.83),   // Oligopoly
  2: Math.round(player_count * 1.20),   // Perfect Competition
}
```

Minimum supply of 1 for any round (edge case with very few players).
