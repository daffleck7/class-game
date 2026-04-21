# Market Mayhem - Design Spec

## Purpose

Demonstrate how increasing competition (more firms/supply) shifts surplus from producers to consumers. Players experience this firsthand through three market phases with increasing supply, each containing three bidding rounds for price discovery.

## Core Mechanic

- Every player values one unit at exactly **$100**
- The game has 3 market phases: Monopoly, Oligopoly, Perfect Competition
- Each phase has **3 sealed-bid rounds** — rounds 1 and 2 are price discovery, round 3 determines winners
- After each round, all bids are revealed so players learn the market before bidding again
- The top N bids in round 3 win, where N = supply for that phase
- **Winners** score consumer surplus: $100 - their bid
- **Losers** score $0 for the phase
- **Producer surplus** for each phase = sum of all winning bids (round 3)
- **Consumer surplus** for each phase = sum of ($100 - bid) for all winners (round 3)
- Player with the highest total consumer surplus across all 3 phases wins individually
- Team with the highest average total consumer surplus wins

## Market Phases

Supply is calculated as a percentage of player count (rounded to nearest whole number). Minimum supply of 1.

| Phase | Label | Supply | Lesson |
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
- Host clicks "Start Game" to begin Phase 1

### 2. Bidding Phase (repeated for each of the 3 market phases)

Each market phase consists of 3 sealed-bid rounds:

**During a bidding round:**
- Host screen announces the phase name (e.g., "Monopoly — Round 1 of 3") and supply count
- Host screen shows a counter: "X/Y players have bid"
- Players see a bid input on their phone (positive whole dollars, no cap enforced)
- Players submit one sealed bid — they cannot see anyone else's bid
- Player screen shows their bid and "Consumer surplus if you win: $X" ($100 - bid)
- Host clicks "Reveal Bids" once all/enough bids are in

**After bid reveal (rounds 1 and 2):**
- Host screen shows all bids sorted highest to lowest, with player names, and a clear **buy-line** dividing winners from losers (based on supply)
- Player screen shows a simple **green screen** (in the buying zone) or **red screen** (out of the buying zone)
- Host clicks "Next Round" to open the next bidding round — players' bids reset

**After bid reveal (round 3 — final):**
- Same host display as above but this round determines actual winners
- Winners and losers are locked in
- Host screen also shows phase totals: producer surplus and consumer surplus
- Player screen shows green/red plus their consumer surplus for the phase (or $0 if lost)
- Host clicks "Next Phase" (or "See Final Results" after Phase 3)

### 3. Between Phases

- Player bids reset to null for the new phase
- Supply recalculates for the next market structure
- Running total of consumer surplus carries forward

### 4. Final Results

- **Surplus comparison**: visual showing producer surplus vs consumer surplus across all 3 phases, demonstrating the shift as competition increases
- **Individual leaderboard**: all players ranked by total consumer surplus across 3 phases
- **Team leaderboard**: teams ranked by average total consumer surplus of their members

## Player Screen States

| State | What the player sees |
|-------|---------------------|
| Joined / Waiting | "Waiting for host to start..." |
| Bidding | Bid input, current bid amount, surplus preview, phase + round info |
| Bid Revealed (rounds 1-2) | Green or red screen (in/out of buying zone) |
| Bid Revealed (round 3) | Green or red screen + consumer surplus for the phase |
| Final | Individual rank, team rank, surplus breakdown by phase |

## Host Screen States

| State | What the host sees |
|-------|-------------------|
| Lobby | Room code, QR code, player list, "Start Game" button |
| Collecting Bids | Phase label, round number, supply count, bid counter (X/Y), "Reveal Bids" button |
| Bids Revealed (rounds 1-2) | Sorted bid list with buy-line, "Next Round" button |
| Bids Revealed (round 3) | Sorted bid list with buy-line, phase surplus totals, "Next Phase" / "See Final Results" button |
| Final | Surplus comparison chart across phases, individual leaderboard, team leaderboard |

## Data Model

Repurpose the existing Supabase tables.

### `games` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| room_code | text | Unique 6-char code |
| status | text | `lobby`, `bidding`, `revealing`, `finished` |
| current_phase | int | 0-indexed (0, 1, 2) for the 3 market phases |
| current_round | int | 0-indexed (0, 1, 2) for the 3 rounds within a phase |
| round_supply | int | Calculated supply for current phase |
| host_token | text | Auth for host actions |
| phase_results | jsonb | Stored results per phase: `[{phase, label, supply, producer_surplus, consumer_surplus, bids: [{player_id, name, team, bid, won, surplus}]}]` |
| created_at | timestamptz | Auto |

Removed columns (from old game): `current_event_index`, `event_deck`, `round_phase`, `round_end_time`.

### `players` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| game_id | uuid | FK to games |
| name | text | Player display name |
| team | int | 1, 2, 4, 5, or 6 |
| current_bid | int | Null if no bid placed yet, reset each round |
| total_surplus | int | Running total across completed phases, starts at 0 |
| created_at | timestamptz | Auto |

Removed columns (from old game): `allocations`, `cash`, `score`, `locked_in`.

### Realtime

Both tables remain on the Supabase realtime publication. The host screen subscribes to player changes to track bid submission count. Player screens subscribe to game status/phase/round changes to know when to transition screens.

## API Routes

Repurpose the existing route structure under `/api/games/[roomCode]/`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/games` | POST | Create a new game |
| `/api/games/[roomCode]` | GET | Get game state |
| `/api/games/[roomCode]/join` | POST | Join a game (name + team) |
| `/api/games/[roomCode]/bid` | POST | Submit a bid for the current round |
| `/api/games/[roomCode]/advance` | POST | Host: start game, reveal bids, next round, next phase, finish |

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
phase_supply = {
  0: Math.max(1, Math.round(player_count * 0.33)),   // Monopoly
  1: Math.max(1, Math.round(player_count * 0.83)),   // Oligopoly
  2: Math.round(player_count * 1.20),                 // Perfect Competition
}
```
