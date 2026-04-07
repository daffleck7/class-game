# Icebreaker Investment Game — Design Spec

## Overview

An interactive classroom icebreaker game where 15-40 students join from their phones via QR code, allocate a $100 budget across business categories, and compete as random events reward or penalize their investment strategies. Kahoot-style UX: phones are controllers, a shared screen is the stage.

**Setting:** College classroom, first day of a course.
**Duration:** ~10 minutes per game session.

## Core Mechanic: The Wallet

Players start with **$100 in their wallet**. Their wallet balance is their score.

- Allocating money to categories **spends** it from the wallet — the score visibly drops as they invest.
- Events **pay out** returns into the wallet based on what was invested and the event's multipliers.
- Players can choose to invest nothing (keep $100 as cash) for a safe start, but invested money earns multiplied returns over the course of the game, so full-cash players fall behind by round 3-4.

This framing makes the risk/reward intuitive: "spend now to earn more later, or play it safe."

## Categories

Players allocate their $100 across 5 business-themed categories:

1. **R&D** — Research and development investment
2. **Security** — Cybersecurity and defense
3. **Compatibility** — Cross-platform and standards compliance
4. **Marketing** — Brand awareness and outreach
5. **Partnerships** — Strategic alliances and collaborations

Players can allocate any amount (including $0) to any category. Unallocated money stays in the wallet as cash.

## Game Flow

### Phase 1: Lobby

- **Host screen:** Game title, QR code, room code, live list of player names as they join. "Start Game" button appears when 2+ players have joined.
- **Player screen:** Name entry form. After submitting: "Waiting for host to start..." with their name displayed.

### Phase 2: Allocation

- **Host screen:** "Players are investing..." with progress indicator (e.g., "12/18 locked in"). No player allocations are revealed.
- **Player screen:** 5 sliders (or +/- controls), one per category. Wallet balance updates live as they adjust. "Lock In" button to confirm. Host can manually advance once enough players have locked in.

### Phase 3: Events

- **Host screen:** Events reveal one at a time — title, description, then the effect. Leaderboard animates after each event. Host clicks "Next Event" to advance.
- **Player screen:** Current event displayed with their personal gain/loss for that round. Running wallet balance updates in real time.

### Phase 4: Final

- **Host screen:** Final leaderboard with top 3 highlighted. Game over.
- **Player screen:** Their final rank and wallet balance.

All phase transitions are host-controlled. The host drives the pace.

## Data Model

### `games` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `room_code` | text (unique) | 6-char alphanumeric code, embedded in QR URL |
| `status` | text | `lobby` → `allocating` → `playing` → `finished` |
| `current_event_index` | int | Which event is currently shown (-1 = none yet) |
| `event_deck` | jsonb | Array of 7 shuffled event objects for this game |
| `host_token` | text | Random secret for host authentication |
| `created_at` | timestamptz | Auto-generated |

### `players` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated |
| `game_id` | uuid (FK → games) | Which game they belong to |
| `name` | text | Display name |
| `allocations` | jsonb | `{"rd": 20, "security": 30, "compatibility": 10, "marketing": 25, "partnerships": 15}` |
| `cash` | int | Unallocated budget kept in wallet |
| `score` | int | Running wallet balance (starts at cash kept after allocation) |
| `locked_in` | boolean | Whether allocations are submitted |
| `created_at` | timestamptz | Auto-generated |

### Event object (stored in `event_deck` jsonb array)

```json
{
  "title": "Data Breach!",
  "description": "Hackers target companies with weak defenses.",
  "effects": {
    "security": 3.0,
    "rd": -0.5,
    "compatibility": 0,
    "marketing": -1.0,
    "partnerships": 0
  }
}
```

## Scoring

**Per event:** `round_score = sum(allocation[category] × effect[category])` for all 5 categories. The result is added to (or subtracted from) the player's wallet balance.

**Initial score:** `100 - total_invested + 0 = cash kept`. A player who invests $80 starts at wallet $20. A player who invests $0 starts at wallet $100.

**Over the full game:** A balanced $100 investment across 7 events returns roughly $180-250 total, making full investment the winning long-term strategy. Negative multipliers are mild (-0.5 to -1.5) so even unlucky investors recover.

## Event Deck

The game ships with 10 pre-built events. Each game randomly selects and shuffles 7 of them.

| # | Event | R&D | Security | Compat. | Marketing | Partners. |
|---|-------|-----|----------|---------|-----------|-----------|
| 1 | **Breakthrough Innovation** — Your R&D lab strikes gold | 2.5 | 0 | 0 | 0.5 | 0 |
| 2 | **Data Breach** — Hackers exploit weak defenses | -0.5 | 3.0 | 0 | -1.0 | 0 |
| 3 | **Industry Standard Shift** — New compatibility requirements | 0 | 0 | 2.5 | 0 | 1.0 |
| 4 | **Viral Campaign** — Your product goes viral on social media | 0 | 0 | 0.5 | 3.0 | 0.5 |
| 5 | **Strategic Alliance** — A major player wants to partner up | 0 | 0 | 0.5 | 0.5 | 3.0 |
| 6 | **Market Crash** — Economic downturn hits everyone | -0.5 | 0.5 | 0 | -1.5 | -1.0 |
| 7 | **Copycat Competitor** — A rival clones your product | 1.5 | 0 | -1.0 | 1.0 | -0.5 |
| 8 | **Government Regulation** — New compliance laws hit | 0 | 2.0 | 1.5 | -0.5 | 0 |
| 9 | **Tech Conference Buzz** — Industry spotlight on your company | 0.5 | 0 | 0.5 | 1.5 | 1.5 |
| 10 | **Supply Chain Crisis** — Key partnerships are tested | -1.0 | 0 | -0.5 | 0 | 2.5 |

The deck is fixed for v1 but the architecture supports easy swapping/customization in the future.

## Tech Architecture

### Stack

- **Frontend & API:** Next.js (App Router) deployed on Vercel free tier
- **Database & Realtime:** Supabase (Postgres + Realtime) free tier
- **QR Generation:** `qrcode.react` library, client-side

### Project Structure

```
class-game/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Landing — "Host a Game" or "Join a Game"
│   │   ├── host/[roomCode]/
│   │   │   └── page.tsx            # Host screen (all 4 phases)
│   │   ├── play/[roomCode]/
│   │   │   └── page.tsx            # Player screen (all 4 phases)
│   │   └── api/
│   │       ├── games/route.ts              # POST: create game
│   │       └── games/[roomCode]/
│   │           ├── route.ts                # GET: game state
│   │           ├── join/route.ts           # POST: join game
│   │           ├── allocate/route.ts       # POST: submit allocations
│   │           ├── advance/route.ts        # POST: host advances phase/event
│   │           └── scores/route.ts         # GET: leaderboard
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client initialization
│   │   ├── events.ts               # Event deck definitions
│   │   └── game-logic.ts           # Score calculation, deck shuffling
│   └── components/
│       ├── host/                   # Host-screen phase components
│       ├── player/                 # Player-screen phase components
│       ├── Leaderboard.tsx
│       ├── QRCode.tsx
│       └── AllocationSliders.tsx
├── supabase/
│   └── migrations/                 # SQL migrations for tables + RLS policies
├── next.config.js
├── package.json
└── .env.example
```

### Real-time Sync Pattern

- Host and player screens subscribe to Supabase Realtime on `games` and `players` tables, filtered by `room_code`.
- Host advances phase or triggers event → API route updates `games` row → Supabase pushes change to all subscribers.
- Player locks in allocations → API route updates their `players` row → host screen sees lock-in count update.

### Score Calculation

Server-side in the `advance` API route:
1. Fetch all players for the game
2. Apply current event's multipliers to each player's allocations
3. Update all player scores in a single batch
4. Bump `current_event_index`
5. All in one transaction — Supabase pushes updated scores to all clients

### Security (Supabase RLS)

- Players can only read/write their own `players` row
- Only the host can call `advance` (verified by `host_token` stored in browser sessionStorage)
- Game data is read-only for players

## Deployment

### Vercel (free tier)

- Deploy via GitHub integration — push to `main` triggers auto-deploy
- No special config needed for App Router
- Provides `your-app.vercel.app` domain

### Supabase (free tier)

- Create project at supabase.com (no credit card required)
- Run SQL migration for tables and RLS policies
- 200 concurrent connections (plenty for 15-40 players)
- 500MB database storage

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
HOST_SECRET=<random string for host token generation>
```

### Host Authentication

- When a host creates a game, the API generates a random `host_token`, stores it in the `games` row, and returns it to the host browser (stored in sessionStorage).
- Host-only API routes require this token in the request header.
- No login, no accounts — just a per-game secret.

### QR Code

- Generated client-side on the host screen
- Encodes: `https://your-app.vercel.app/play/ROOM_CODE`
- Players scan → land on player page → enter name → joined

## Future Considerations (not in v1)

- Host customization: editable categories, custom events, adjustable budget
- Timer for allocation phase
- Fun stats/superlatives at game end
- Multiple rounds with re-allocation
- Sound effects and animations for event reveals
