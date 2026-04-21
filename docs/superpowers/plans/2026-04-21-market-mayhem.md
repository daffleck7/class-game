# Market Mayhem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose the existing Budget Blitz class game into Market Mayhem — a sealed-bid auction game demonstrating consumer surplus shifts across monopoly, oligopoly, and perfect competition.

**Architecture:** Replace the old allocation/event game loop with a 3-phase x 3-round sealed-bid auction. Each phase has a different supply level. Rounds 1-2 are price discovery (bids revealed, then reset). Round 3 determines winners. Reuse the existing lobby/join flow, Supabase realtime, host/player page structure, and team system.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres + Realtime), Tailwind CSS, Vitest

---

## File Structure

### Files to create
- `src/lib/auction-logic.ts` — supply calculation, bid sorting, winner determination, surplus math
- `src/components/host/HostBidding.tsx` — host screen during bid collection (shows bid counter)
- `src/components/host/HostReveal.tsx` — host screen showing sorted bids with buy-line
- `src/components/host/HostFinal.tsx` — rewrite for final results (surplus chart + leaderboards)
- `src/components/player/PlayerBidding.tsx` — player bid input screen
- `src/components/player/PlayerReveal.tsx` — player green/red result screen
- `src/components/player/PlayerFinal.tsx` — rewrite for final results
- `src/app/api/games/[roomCode]/bid/route.ts` — new bid submission endpoint
- `__tests__/lib/auction-logic.test.ts` — tests for auction logic
- `__tests__/api/bid.test.ts` — tests for bid endpoint
- `__tests__/api/advance-auction.test.ts` — tests for updated advance endpoint
- `supabase/migrations/002_auction_tables.sql` — migration to reshape tables

### Files to modify
- `src/lib/game-logic.ts` — remove old functions, keep `generateRoomCode` and `calculateTeamScores`
- `src/app/page.tsx` — rename to Market Mayhem
- `src/app/layout.tsx` — update title/description
- `src/app/host/[roomCode]/page.tsx` — rewrite for auction flow
- `src/app/play/[roomCode]/page.tsx` — rewrite for auction flow
- `src/app/api/games/route.ts` — simplify game creation (no event deck)
- `src/app/api/games/[roomCode]/route.ts` — update selected columns
- `src/app/api/games/[roomCode]/join/route.ts` — update player insert (no cash/score/allocations)
- `src/app/api/games/[roomCode]/advance/route.ts` — complete rewrite for auction state machine
- `src/components/host/HostLobby.tsx` — rename game title

### Files to delete
- `src/lib/events.ts` — no longer needed
- `src/components/AllocationSliders.tsx` — no longer needed
- `src/components/host/HostAllocation.tsx` — no longer needed
- `src/components/host/HostEvents.tsx` — no longer needed
- `src/components/player/PlayerAllocation.tsx` — no longer needed
- `src/components/player/PlayerEvents.tsx` — no longer needed
- `src/components/player/PlayerWaiting.tsx` — replaced by PlayerBidding/PlayerReveal
- `src/components/PlayerMVPs.tsx` — no longer needed
- `src/app/api/games/[roomCode]/allocate/route.ts` — no longer needed
- `src/app/api/games/[roomCode]/scores/route.ts` — no longer needed
- `__tests__/lib/events.test.ts` — no longer needed
- `__tests__/api/allocate.test.ts` — no longer needed
- `__tests__/api/advance.test.ts` — replaced by new test

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/002_auction_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Drop old columns from games
ALTER TABLE games DROP COLUMN IF EXISTS current_event_index;
ALTER TABLE games DROP COLUMN IF EXISTS event_deck;
ALTER TABLE games DROP COLUMN IF EXISTS round_phase;
ALTER TABLE games DROP COLUMN IF EXISTS round_end_time;

-- Add new columns to games
ALTER TABLE games ADD COLUMN current_phase int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN current_round int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN round_supply int NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN phase_results jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update status check constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('lobby', 'bidding', 'revealing', 'finished'));

-- Drop old columns from players
ALTER TABLE players DROP COLUMN IF EXISTS allocations;
ALTER TABLE players DROP COLUMN IF EXISTS cash;
ALTER TABLE players DROP COLUMN IF EXISTS score;
ALTER TABLE players DROP COLUMN IF EXISTS locked_in;

-- Add new columns to players
ALTER TABLE players ADD COLUMN current_bid int;
ALTER TABLE players ADD COLUMN total_surplus int NOT NULL DEFAULT 0;

-- Drop old team constraint and add updated one (same values, just ensuring it's clean)
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_check;
ALTER TABLE players ADD CONSTRAINT players_team_check CHECK (team IN (1, 2, 4, 5, 6));
```

- [ ] **Step 2: Run migration against Supabase**

Run the migration in the Supabase dashboard SQL editor or via CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_auction_tables.sql
git commit -m "Add migration for auction table schema"
```

---

### Task 2: Auction Logic Module

**Files:**
- Create: `src/lib/auction-logic.ts`
- Create: `__tests__/lib/auction-logic.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/auction-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateSupply,
  resolveRound,
  PHASE_LABELS,
  PHASE_SUPPLY_RATIOS,
} from "@/lib/auction-logic";

describe("PHASE_LABELS", () => {
  it("has labels for all 3 phases", () => {
    expect(PHASE_LABELS).toEqual(["Monopoly", "Oligopoly", "Perfect Competition"]);
  });
});

describe("calculateSupply", () => {
  it("returns 33% for monopoly phase", () => {
    expect(calculateSupply(0, 30)).toBe(10);
  });

  it("returns 83% for oligopoly phase", () => {
    expect(calculateSupply(1, 30)).toBe(25);
  });

  it("returns 120% for perfect competition phase", () => {
    expect(calculateSupply(2, 30)).toBe(36);
  });

  it("rounds to nearest whole number", () => {
    expect(calculateSupply(0, 10)).toBe(3); // 3.3 -> 3
    expect(calculateSupply(1, 10)).toBe(8); // 8.3 -> 8
  });

  it("enforces minimum supply of 1", () => {
    expect(calculateSupply(0, 1)).toBe(1); // 0.33 -> 0 -> clamped to 1
  });

  it("allows supply > player count for perfect competition", () => {
    expect(calculateSupply(2, 5)).toBe(6); // 6.0
  });
});

describe("resolveRound", () => {
  it("sorts bids highest to lowest and marks top N as winners", () => {
    const bids = [
      { player_id: "a", name: "Alice", team: 1, bid: 80 },
      { player_id: "b", name: "Bob", team: 2, bid: 95 },
      { player_id: "c", name: "Carol", team: 1, bid: 60 },
    ];
    const result = resolveRound(bids, 2);

    expect(result.sorted_bids[0]).toMatchObject({ player_id: "b", bid: 95, won: true, surplus: 5 });
    expect(result.sorted_bids[1]).toMatchObject({ player_id: "a", bid: 80, won: true, surplus: 20 });
    expect(result.sorted_bids[2]).toMatchObject({ player_id: "c", bid: 60, won: false, surplus: 0 });
  });

  it("calculates producer and consumer surplus correctly", () => {
    const bids = [
      { player_id: "a", name: "Alice", team: 1, bid: 90 },
      { player_id: "b", name: "Bob", team: 2, bid: 70 },
      { player_id: "c", name: "Carol", team: 1, bid: 50 },
    ];
    const result = resolveRound(bids, 2);

    // Winners: Alice (90) + Bob (70) = 160 producer surplus
    expect(result.producer_surplus).toBe(160);
    // Consumer surplus: (100-90) + (100-70) = 10 + 30 = 40
    expect(result.consumer_surplus).toBe(40);
  });

  it("handles bids over $100 (negative consumer surplus for winner)", () => {
    const bids = [
      { player_id: "a", name: "Alice", team: 1, bid: 140 },
    ];
    const result = resolveRound(bids, 1);

    expect(result.sorted_bids[0]).toMatchObject({ won: true, surplus: -40 });
    expect(result.producer_surplus).toBe(140);
    expect(result.consumer_surplus).toBe(-40);
  });

  it("handles supply greater than number of bidders", () => {
    const bids = [
      { player_id: "a", name: "Alice", team: 1, bid: 30 },
      { player_id: "b", name: "Bob", team: 2, bid: 20 },
    ];
    const result = resolveRound(bids, 5);

    expect(result.sorted_bids.every((b) => b.won)).toBe(true);
    expect(result.producer_surplus).toBe(50);
    expect(result.consumer_surplus).toBe(150); // (100-30) + (100-20)
  });

  it("players who did not bid get bid of 0 and lose", () => {
    const bids = [
      { player_id: "a", name: "Alice", team: 1, bid: 50 },
      { player_id: "b", name: "Bob", team: 2, bid: 0 },
    ];
    const result = resolveRound(bids, 1);

    expect(result.sorted_bids[0]).toMatchObject({ player_id: "a", won: true });
    expect(result.sorted_bids[1]).toMatchObject({ player_id: "b", won: false, surplus: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/auction-logic.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/auction-logic.ts
/**
 * Auction logic for Market Mayhem.
 *
 * Handles supply calculation, bid resolution, and surplus computation
 * for the sealed-bid auction game.
 */

export const PHASE_LABELS = ["Monopoly", "Oligopoly", "Perfect Competition"] as const;

export const PHASE_SUPPLY_RATIOS = [0.33, 0.83, 1.2] as const;

const UNIT_VALUE = 100;

/**
 * Calculates the supply (number of available units) for a given phase
 * based on the number of players. Minimum supply is 1.
 */
export function calculateSupply(phase: number, playerCount: number): number {
  const ratio = PHASE_SUPPLY_RATIOS[phase];
  return Math.max(1, Math.round(playerCount * ratio));
}

export interface BidInput {
  player_id: string;
  name: string;
  team: number;
  bid: number;
}

export interface ResolvedBid {
  player_id: string;
  name: string;
  team: number;
  bid: number;
  won: boolean;
  surplus: number;
}

export interface RoundResult {
  sorted_bids: ResolvedBid[];
  producer_surplus: number;
  consumer_surplus: number;
}

/**
 * Resolves a round of bidding: sorts bids highest to lowest,
 * determines winners (top N by supply), and calculates surplus.
 */
export function resolveRound(bids: BidInput[], supply: number): RoundResult {
  const sorted = [...bids].sort((a, b) => b.bid - a.bid);

  const sorted_bids: ResolvedBid[] = sorted.map((bid, index) => {
    const won = index < supply;
    return {
      player_id: bid.player_id,
      name: bid.name,
      team: bid.team,
      bid: bid.bid,
      won,
      surplus: won ? UNIT_VALUE - bid.bid : 0,
    };
  });

  let producer_surplus = 0;
  let consumer_surplus = 0;
  for (const bid of sorted_bids) {
    if (bid.won) {
      producer_surplus += bid.bid;
      consumer_surplus += bid.surplus;
    }
  }

  return { sorted_bids, producer_surplus, consumer_surplus };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/auction-logic.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auction-logic.ts __tests__/lib/auction-logic.test.ts
git commit -m "Add auction logic: supply calculation and bid resolution"
```

---

### Task 3: Clean Up Old Game Logic

**Files:**
- Modify: `src/lib/game-logic.ts`
- Delete: `src/lib/events.ts`
- Modify: `__tests__/lib/game-logic.test.ts`
- Delete: `__tests__/lib/events.test.ts`

- [ ] **Step 1: Update game-logic.ts — remove old functions, keep reusable ones**

Replace the entire file with:

```typescript
// src/lib/game-logic.ts
/**
 * Shared game utilities for Market Mayhem.
 *
 * Provides room code generation and team score aggregation.
 */

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

export interface TeamScore {
  team: number;
  averageScore: number;
  playerCount: number;
}

/**
 * Aggregates individual player scores into team averages and sorts
 * the result by average score descending (highest score first).
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
```

- [ ] **Step 2: Update game-logic tests — remove shuffleDeck and calculateRoundScore tests**

Replace the entire test file with:

```typescript
// __tests__/lib/game-logic.test.ts
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
```

- [ ] **Step 3: Delete old files**

```bash
rm src/lib/events.ts __tests__/lib/events.test.ts
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run __tests__/lib/game-logic.test.ts __tests__/lib/auction-logic.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/game-logic.ts src/lib/events.ts __tests__/lib/game-logic.test.ts __tests__/lib/events.test.ts
git commit -m "Remove old investment logic, keep room code and team scores"
```

---

### Task 4: API — Create Game & Get Game

**Files:**
- Modify: `src/app/api/games/route.ts`
- Modify: `src/app/api/games/[roomCode]/route.ts`
- Modify: `__tests__/api/create-game.test.ts`

- [ ] **Step 1: Rewrite create game route**

```typescript
// src/app/api/games/route.ts
/**
 * POST /api/games
 *
 * Creates a new Market Mayhem game room.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateRoomCode } from "@/lib/game-logic";
import crypto from "crypto";

export async function POST() {
  const supabase = createServerClient();
  const roomCode = generateRoomCode();
  const hostToken = crypto.randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("games")
    .insert({
      room_code: roomCode,
      host_token: hostToken,
      status: "lobby",
      current_phase: 0,
      current_round: 0,
      round_supply: 0,
      phase_results: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }

  return NextResponse.json(
    { room_code: data.room_code, host_token: data.host_token },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Rewrite get game route**

```typescript
// src/app/api/games/[roomCode]/route.ts
/**
 * GET /api/games/[roomCode]
 *
 * Returns the current game state.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServerClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("id, room_code, status, current_phase, current_round, round_supply, phase_results, created_at")
    .eq("room_code", roomCode)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game);
}
```

- [ ] **Step 3: Update create game test**

```typescript
// __tests__/api/create-game.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

import { POST } from "@/app/api/games/route";

describe("POST /api/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a game and returns room_code and host_token", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "uuid-123",
        room_code: "ABC123",
        host_token: "token-xyz",
        status: "lobby",
      },
      error: null,
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.room_code).toBeTruthy();
    expect(body.host_token).toBeTruthy();
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.status).toBe("lobby");
    expect(insertArg.current_phase).toBe(0);
    expect(insertArg.current_round).toBe(0);
    expect(insertArg.phase_results).toEqual([]);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run __tests__/api/create-game.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/games/route.ts src/app/api/games/[roomCode]/route.ts __tests__/api/create-game.test.ts
git commit -m "Update game create/get API routes for auction schema"
```

---

### Task 5: API — Join Game

**Files:**
- Modify: `src/app/api/games/[roomCode]/join/route.ts`
- Modify: `__tests__/api/join-game.test.ts`

- [ ] **Step 1: Rewrite join route**

```typescript
// src/app/api/games/[roomCode]/join/route.ts
/**
 * POST /api/games/[roomCode]/join
 *
 * Adds a player to the game lobby.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { TEAMS } from "@/lib/teams";

interface JoinRequest {
  name?: string;
  team?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body: JoinRequest = await request.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.team || !(TEAMS as readonly number[]).includes(body.team)) {
    return NextResponse.json({ error: "Team must be one of: 1, 2, 4, 5, 6" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      name: body.name.trim(),
      team: body.team,
    })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }

  return NextResponse.json(
    { player_id: player.id, name: player.name, team: player.team },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Update join test (remove score/cash from insert expectations)**

```typescript
// __tests__/api/join-game.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/join/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[roomCode]/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins a game in lobby status", async () => {
    // First call: games lookup
    mockFrom.mockImplementationOnce(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: "game-uuid", status: "lobby" },
            error: null,
          }),
        }),
      }),
    }));

    // Second call: player insert
    mockFrom.mockImplementationOnce(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockInsertSelect.mockReturnValue({
          single: mockInsertSingle.mockResolvedValue({
            data: { id: "player-uuid", name: "Alice", team: 1 },
            error: null,
          }),
        }),
      }),
    }));

    const request = createRequest({ name: "Alice", team: 1 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.player_id).toBe("player-uuid");
    expect(body.name).toBe("Alice");
    expect(body.team).toBe(1);
  });

  it("rejects empty name", async () => {
    const request = createRequest({ name: "", team: 1 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });

  it("rejects invalid team", async () => {
    const request = createRequest({ name: "Alice", team: 3 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run __tests__/api/join-game.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/games/[roomCode]/join/route.ts __tests__/api/join-game.test.ts
git commit -m "Update join route for auction schema"
```

---

### Task 6: API — Bid Submission

**Files:**
- Create: `src/app/api/games/[roomCode]/bid/route.ts`
- Create: `__tests__/api/bid.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/api/bid.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/bid/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/bid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[roomCode]/bid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-positive bid", async () => {
    const request = createRequest({ player_id: "p1", bid: 0 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });

  it("rejects non-integer bid", async () => {
    const request = createRequest({ player_id: "p1", bid: 50.5 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });

  it("rejects missing player_id", async () => {
    const request = createRequest({ bid: 50 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });

  it("accepts a valid bid when game is in bidding status", async () => {
    // Game lookup
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: "game-uuid", status: "bidding" },
            error: null,
          }),
        }),
      }),
    }));

    // Player update
    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: "p1", current_bid: 75 },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    const request = createRequest({ player_id: "p1", bid: 75 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bid).toBe(75);
  });

  it("rejects bid when game is not in bidding status", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: "game-uuid", status: "revealing" },
            error: null,
          }),
        }),
      }),
    }));

    const request = createRequest({ player_id: "p1", bid: 50 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/api/bid.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the bid route**

```typescript
// src/app/api/games/[roomCode]/bid/route.ts
/**
 * POST /api/games/[roomCode]/bid
 *
 * Submits or updates a player's sealed bid for the current round.
 * Only allowed when game status is 'bidding'.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

interface BidRequest {
  player_id?: string;
  bid?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body: BidRequest = await request.json();

  if (!body.player_id) {
    return NextResponse.json({ error: "player_id is required" }, { status: 400 });
  }

  if (typeof body.bid !== "number" || body.bid <= 0 || !Number.isInteger(body.bid)) {
    return NextResponse.json({ error: "Bid must be a positive whole dollar amount" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "bidding") {
    return NextResponse.json({ error: "Bids are not being accepted right now" }, { status: 400 });
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .update({ current_bid: body.bid })
    .eq("id", body.player_id)
    .eq("game_id", game.id)
    .select()
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "Failed to submit bid" }, { status: 500 });
  }

  return NextResponse.json({ bid: player.current_bid });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/api/bid.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/games/[roomCode]/bid/route.ts __tests__/api/bid.test.ts
git commit -m "Add bid submission API endpoint"
```

---

### Task 7: API — Advance (Auction State Machine)

**Files:**
- Rewrite: `src/app/api/games/[roomCode]/advance/route.ts`
- Create: `__tests__/api/advance-auction.test.ts`
- Delete: `__tests__/api/advance.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/api/advance-auction.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/advance/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockGameLookup(game: Record<string, unknown>) {
  mockFrom.mockImplementationOnce(() => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: game, error: null }),
      }),
    }),
  }));
}

function mockPlayerCount(count: number) {
  mockFrom.mockImplementationOnce(() => ({
    select: () => ({
      eq: () => Promise.resolve({
        data: Array.from({ length: count }, (_, i) => ({ id: `p${i}` })),
        error: null,
        count,
      }),
    }),
  }));
}

function mockUpdate() {
  mockFrom.mockImplementationOnce(() => ({
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }));
}

describe("POST /api/games/[roomCode]/advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing host_token", async () => {
    const request = createRequest({});
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(400);
  });

  it("rejects invalid host_token", async () => {
    mockGameLookup({
      id: "g1",
      status: "lobby",
      host_token: "correct-token",
      current_phase: 0,
      current_round: 0,
      phase_results: [],
    });

    const request = createRequest({ host_token: "wrong-token" });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });

    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/api/advance-auction.test.ts
```
Expected: FAIL — old module has wrong signature or missing.

- [ ] **Step 3: Rewrite the advance route**

```typescript
// src/app/api/games/[roomCode]/advance/route.ts
/**
 * POST /api/games/[roomCode]/advance
 *
 * State machine for the host to advance through auction phases.
 *
 * Transitions:
 *   lobby -> bidding (start game: calculate supply, open bids)
 *   bidding -> revealing (reveal bids)
 *   revealing -> bidding (next round: reset bids, increment round)
 *   revealing -> bidding (next phase: reset bids, increment phase, reset round, recalc supply)
 *   revealing -> finished (after phase 3, round 3)
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateSupply, resolveRound } from "@/lib/auction-logic";

interface AdvanceRequest {
  host_token: string;
  action?: "reveal" | "next_round" | "next_phase" | "finish";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body: AdvanceRequest = await request.json();

  if (!body.host_token) {
    return NextResponse.json({ error: "host_token required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, host_token, current_phase, current_round, round_supply, phase_results")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (body.host_token !== game.host_token) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 403 });
  }

  // LOBBY -> BIDDING (start game)
  if (game.status === "lobby") {
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);

    const playerCount = players?.length ?? 0;
    if (playerCount < 2) {
      return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });
    }

    const supply = calculateSupply(0, playerCount);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_phase: 0,
        current_round: 0,
        round_supply: supply,
      })
      .eq("id", game.id);

    return NextResponse.json({ status: "bidding", phase: 0, round: 0, supply });
  }

  // BIDDING -> REVEALING (reveal bids)
  if (game.status === "bidding" && body.action === "reveal") {
    const { data: players } = await supabase
      .from("players")
      .select("id, name, team, current_bid")
      .eq("game_id", game.id);

    if (!players) {
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
    }

    const bids = players.map((p) => ({
      player_id: p.id,
      name: p.name,
      team: p.team,
      bid: p.current_bid ?? 0,
    }));

    const result = resolveRound(bids, game.round_supply);

    // If this is round 3 (index 2), store phase results and update surplus
    if (game.current_round === 2) {
      const phaseResults = [...(game.phase_results as unknown[]), {
        phase: game.current_phase,
        supply: game.round_supply,
        producer_surplus: result.producer_surplus,
        consumer_surplus: result.consumer_surplus,
        bids: result.sorted_bids,
      }];

      await supabase
        .from("games")
        .update({ status: "revealing", phase_results: phaseResults })
        .eq("id", game.id);

      // Update each winner's total_surplus
      for (const bid of result.sorted_bids) {
        if (bid.won && bid.surplus !== 0) {
          const player = players.find((p) => p.id === bid.player_id);
          if (player) {
            await supabase.rpc("increment_surplus", {
              p_player_id: bid.player_id,
              p_amount: bid.surplus,
            }).then(({ error }) => {
              // Fallback: direct update if RPC doesn't exist
              if (error) {
                return supabase
                  .from("players")
                  .update({ total_surplus: bid.surplus })
                  .eq("id", bid.player_id);
              }
            });
          }
        }
      }
    } else {
      await supabase
        .from("games")
        .update({ status: "revealing" })
        .eq("id", game.id);
    }

    return NextResponse.json({
      status: "revealing",
      round: game.current_round,
      phase: game.current_phase,
      result,
    });
  }

  // REVEALING -> BIDDING (next round within same phase)
  if (game.status === "revealing" && body.action === "next_round") {
    if (game.current_round >= 2) {
      return NextResponse.json({ error: "No more rounds in this phase" }, { status: 400 });
    }

    // Reset all player bids
    await supabase
      .from("players")
      .update({ current_bid: null })
      .eq("game_id", game.id);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_round: game.current_round + 1,
      })
      .eq("id", game.id);

    return NextResponse.json({
      status: "bidding",
      phase: game.current_phase,
      round: game.current_round + 1,
    });
  }

  // REVEALING -> BIDDING (next phase)
  if (game.status === "revealing" && body.action === "next_phase") {
    if (game.current_phase >= 2) {
      return NextResponse.json({ error: "No more phases" }, { status: 400 });
    }

    const nextPhase = game.current_phase + 1;

    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);

    const playerCount = players?.length ?? 0;
    const supply = calculateSupply(nextPhase, playerCount);

    // Reset all player bids
    await supabase
      .from("players")
      .update({ current_bid: null })
      .eq("game_id", game.id);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_phase: nextPhase,
        current_round: 0,
        round_supply: supply,
      })
      .eq("id", game.id);

    return NextResponse.json({
      status: "bidding",
      phase: nextPhase,
      round: 0,
      supply,
    });
  }

  // REVEALING -> FINISHED
  if (game.status === "revealing" && body.action === "finish") {
    await supabase
      .from("games")
      .update({ status: "finished" })
      .eq("id", game.id);

    return NextResponse.json({ status: "finished" });
  }

  return NextResponse.json({ error: "Invalid action for current game state" }, { status: 400 });
}
```

- [ ] **Step 4: Delete old advance test, run new tests**

```bash
rm __tests__/api/advance.test.ts
npx vitest run __tests__/api/advance-auction.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/games/[roomCode]/advance/route.ts __tests__/api/advance-auction.test.ts
git add --all __tests__/api/advance.test.ts
git commit -m "Rewrite advance API for auction state machine"
```

---

### Task 8: Delete Old Files

**Files:**
- Delete all old components and routes no longer needed.

- [ ] **Step 1: Delete old files**

```bash
rm src/components/AllocationSliders.tsx
rm src/components/PlayerMVPs.tsx
rm src/components/host/HostAllocation.tsx
rm src/components/host/HostEvents.tsx
rm src/components/host/HostFinal.tsx
rm src/components/player/PlayerAllocation.tsx
rm src/components/player/PlayerEvents.tsx
rm src/components/player/PlayerWaiting.tsx
rm src/components/player/PlayerFinal.tsx
rm src/app/api/games/[roomCode]/allocate/route.ts
rm src/app/api/games/[roomCode]/scores/route.ts
rm __tests__/api/allocate.test.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Remove old Budget Blitz components and routes"
```

---

### Task 9: Host Components — Lobby, Bidding, Reveal

**Files:**
- Modify: `src/components/host/HostLobby.tsx`
- Create: `src/components/host/HostBidding.tsx`
- Create: `src/components/host/HostReveal.tsx`

- [ ] **Step 1: Update HostLobby title**

In `src/components/host/HostLobby.tsx`, change the title from "Budget Blitz" to "Market Mayhem":

```typescript
// Change line 30:
<h1 className="text-4xl font-bold">Market Mayhem</h1>
```

- [ ] **Step 2: Create HostBidding component**

```typescript
// src/components/host/HostBidding.tsx
"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";

interface Player {
  id: string;
  name: string;
  current_bid: number | null;
}

interface HostBiddingProps {
  phase: number;
  round: number;
  supply: number;
  players: Player[];
  onReveal: () => void;
}

/**
 * Host screen during bid collection.
 * Shows phase/round info, supply, and bid submission counter.
 */
export default function HostBidding({ phase, round, supply, players, onReveal }: HostBiddingProps) {
  const bidsIn = players.filter((p) => p.current_bid !== null).length;
  const totalPlayers = players.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Market Mayhem</h1>
        <h2 className="text-2xl text-indigo-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <p className="text-gray-400 mt-2">
          Supply: <span className="text-white font-bold">{supply} units</span> for{" "}
          <span className="text-white font-bold">{totalPlayers} players</span>
        </p>
      </div>

      <div className="bg-gray-900 rounded-xl p-8 text-center min-w-[300px]">
        <p className="text-gray-400 text-sm mb-2">Bids Received</p>
        <p className="text-6xl font-bold">
          {bidsIn} <span className="text-3xl text-gray-500">/ {totalPlayers}</span>
        </p>
      </div>

      <button
        onClick={onReveal}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Reveal Bids
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create HostReveal component**

```typescript
// src/components/host/HostReveal.tsx
"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";
import type { ResolvedBid } from "@/lib/auction-logic";
import { TEAM_COLORS } from "@/lib/teams";

interface HostRevealProps {
  phase: number;
  round: number;
  supply: number;
  sortedBids: ResolvedBid[];
  producerSurplus: number;
  consumerSurplus: number;
  isFinalRound: boolean;
  isLastPhase: boolean;
  onNextRound: () => void;
  onNextPhase: () => void;
  onFinish: () => void;
}

/**
 * Host screen showing revealed bids sorted with buy-line.
 */
export default function HostReveal({
  phase,
  round,
  supply,
  sortedBids,
  producerSurplus,
  consumerSurplus,
  isFinalRound,
  isLastPhase,
  onNextRound,
  onNextPhase,
  onFinish,
}: HostRevealProps) {
  return (
    <div className="flex flex-col items-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-1">Market Mayhem</h1>
        <h2 className="text-xl text-indigo-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {sortedBids.map((bid, index) => (
            <div key={bid.player_id}>
              {index === supply && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/50">
                  <div className="flex-1 h-px bg-red-500" />
                  <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                    Buy Line — {supply} units available
                  </span>
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              )}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 ${
                  bid.won ? "bg-emerald-900/20" : "bg-gray-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-6 text-right text-sm">{index + 1}</span>
                  <div className={`w-2 h-6 rounded ${TEAM_COLORS[bid.team]}`} />
                  <span className="font-medium">{bid.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">${bid.bid}</span>
                  {isFinalRound && bid.won && (
                    <span className="text-emerald-400 text-sm">+${bid.surplus} surplus</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Show buy line at bottom if all bids are winners */}
          {sortedBids.length <= supply && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30">
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                All bids win — supply exceeds demand
              </span>
            </div>
          )}
        </div>
      </div>

      {isFinalRound && (
        <div className="flex gap-8 text-center">
          <div className="bg-gray-900 rounded-xl p-6 min-w-[200px]">
            <p className="text-gray-400 text-sm mb-1">Producer Surplus</p>
            <p className="text-3xl font-bold text-orange-400">${producerSurplus}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 min-w-[200px]">
            <p className="text-gray-400 text-sm mb-1">Consumer Surplus</p>
            <p className="text-3xl font-bold text-emerald-400">${consumerSurplus}</p>
          </div>
        </div>
      )}

      <div>
        {!isFinalRound && (
          <button
            onClick={onNextRound}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            Next Round
          </button>
        )}
        {isFinalRound && !isLastPhase && (
          <button
            onClick={onNextPhase}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            Next Phase: {PHASE_LABELS[phase + 1]}
          </button>
        )}
        {isFinalRound && isLastPhase && (
          <button
            onClick={onFinish}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
          >
            See Final Results
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/host/HostLobby.tsx src/components/host/HostBidding.tsx src/components/host/HostReveal.tsx
git commit -m "Add host bidding and reveal components"
```

---

### Task 10: Host Final Screen

**Files:**
- Create: `src/components/host/HostFinal.tsx`

- [ ] **Step 1: Create HostFinal component**

```typescript
// src/components/host/HostFinal.tsx
"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";
import type { TeamScore } from "@/lib/game-logic";
import { TEAM_NAMES, TEAM_COLORS } from "@/lib/teams";

interface PhaseResult {
  phase: number;
  producer_surplus: number;
  consumer_surplus: number;
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
  const maxSurplus = Math.max(
    ...phaseResults.flatMap((r) => [r.producer_surplus, r.consumer_surplus]),
    1
  );

  return (
    <div className="flex flex-col items-center p-8 gap-10">
      <h1 className="text-4xl font-bold">Market Mayhem — Results</h1>

      {/* Surplus Comparison Chart */}
      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-center">Surplus by Market Structure</h2>
        <div className="grid grid-cols-3 gap-6">
          {phaseResults.map((result) => (
            <div key={result.phase} className="bg-gray-900 rounded-xl p-4 text-center">
              <h3 className="font-semibold text-indigo-400 mb-4">{PHASE_LABELS[result.phase]}</h3>
              <div className="flex justify-center gap-4 items-end h-40">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-orange-400">${result.producer_surplus}</span>
                  <div
                    className="w-12 bg-orange-500 rounded-t"
                    style={{ height: `${(result.producer_surplus / maxSurplus) * 120}px` }}
                  />
                  <span className="text-xs text-gray-400">Producer</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-emerald-400">${result.consumer_surplus}</span>
                  <div
                    className="w-12 bg-emerald-500 rounded-t"
                    style={{ height: `${(result.consumer_surplus / maxSurplus) * 120}px` }}
                  />
                  <span className="text-xs text-gray-400">Consumer</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Leaderboard */}
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Individual Leaderboard</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {playerRankings.slice(0, 10).map((player, index) => (
            <div
              key={player.name + player.team}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 ${
                index === 0 ? "bg-yellow-900/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-6 text-right font-bold">#{index + 1}</span>
                <div className={`w-2 h-6 rounded ${TEAM_COLORS[player.team]}`} />
                <span className="font-medium">{player.name}</span>
              </div>
              <span className="text-xl font-bold">${player.total_surplus}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Team Leaderboard</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {teamScores.map((ts, index) => (
            <div
              key={ts.team}
              className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 ${
                index === 0 ? "bg-yellow-900/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-6 text-right font-bold">#{index + 1}</span>
                <div className={`w-3 h-8 rounded ${TEAM_COLORS[ts.team]}`} />
                <div>
                  <span className="font-semibold">{TEAM_NAMES[ts.team]}</span>
                  <span className="text-gray-400 text-sm ml-2">({ts.playerCount} players)</span>
                </div>
              </div>
              <span className="text-xl font-bold">${ts.averageScore} avg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/host/HostFinal.tsx
git commit -m "Add host final results screen with surplus chart"
```

---

### Task 11: Player Components — Bidding, Reveal, Final

**Files:**
- Create: `src/components/player/PlayerBidding.tsx`
- Create: `src/components/player/PlayerReveal.tsx`
- Create: `src/components/player/PlayerFinal.tsx`

- [ ] **Step 1: Create PlayerBidding component**

```typescript
// src/components/player/PlayerBidding.tsx
"use client";

import { useState } from "react";
import { PHASE_LABELS } from "@/lib/auction-logic";

interface PlayerBiddingProps {
  roomCode: string;
  playerId: string;
  phase: number;
  round: number;
  supply: number;
  playerCount: number;
  currentBid: number | null;
  onBidSubmitted: (bid: number) => void;
}

/**
 * Player sealed-bid input screen.
 */
export default function PlayerBidding({
  roomCode,
  playerId,
  phase,
  round,
  supply,
  playerCount,
  currentBid,
  onBidSubmitted,
}: PlayerBiddingProps) {
  const [bidInput, setBidInput] = useState(currentBid?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const bidValue = parseInt(bidInput, 10);
  const isValidBid = !isNaN(bidValue) && bidValue > 0 && Number.isInteger(bidValue);
  const surplusPreview = isValidBid ? 100 - bidValue : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidBid) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/games/${roomCode}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, bid: bidValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onBidSubmitted(bidValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Market Mayhem</h1>
        <h2 className="text-lg text-indigo-400 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1} of 3
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {supply} units available for {playerCount} players
        </p>
        {round < 2 && (
          <p className="text-gray-500 text-xs mt-1">Price discovery round — results revealed after</p>
        )}
        {round === 2 && (
          <p className="text-yellow-400 text-xs mt-1 font-semibold">Final round — this bid counts!</p>
        )}
      </div>

      <div className="text-center text-gray-400 text-sm">
        Your valuation: <span className="text-white font-bold">$100</span>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Your Bid ($)</label>
          <input
            type="number"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder="Enter bid"
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-4 px-4 text-center text-3xl font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        {surplusPreview !== null && (
          <div className={`text-center text-lg font-semibold ${surplusPreview >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            Consumer surplus if you win: ${surplusPreview}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !isValidBid}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          {submitting ? "Submitting..." : currentBid ? `Update Bid (was $${currentBid})` : "Submit Bid"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>

      {currentBid && (
        <p className="text-gray-400 text-sm">
          Current bid: <span className="text-white font-bold">${currentBid}</span>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerReveal component**

```typescript
// src/components/player/PlayerReveal.tsx
"use client";

import { PHASE_LABELS } from "@/lib/auction-logic";

interface PlayerRevealProps {
  phase: number;
  round: number;
  won: boolean;
  bid: number;
  surplus: number;
  totalSurplus: number;
  isFinalRound: boolean;
}

/**
 * Player screen after bids are revealed.
 * Shows green (in buying zone) or red (out).
 */
export default function PlayerReveal({
  phase,
  round,
  won,
  bid,
  surplus,
  totalSurplus,
  isFinalRound,
}: PlayerRevealProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-6 gap-6 ${
        won ? "bg-emerald-900" : "bg-red-900"
      }`}
    >
      <div className="text-center">
        <h2 className="text-lg text-white/70 font-semibold">
          {PHASE_LABELS[phase]} — Round {round + 1}
        </h2>
      </div>

      <div className="text-center">
        <p className="text-6xl font-bold mb-4">{won ? "IN" : "OUT"}</p>
        <p className="text-2xl text-white/80">
          {won ? "You're in the buying zone!" : "You're out of the buying zone"}
        </p>
      </div>

      <div className="text-center text-white/70">
        <p className="text-lg">Your bid: <span className="text-white font-bold">${bid}</span></p>
      </div>

      {isFinalRound && (
        <div className="bg-black/20 rounded-xl p-6 text-center">
          <p className="text-white/70 text-sm mb-1">Your surplus this phase</p>
          <p className={`text-4xl font-bold ${surplus >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            ${surplus}
          </p>
          <p className="text-white/50 text-sm mt-3">Running total: ${totalSurplus}</p>
        </div>
      )}

      <p className="text-white/50 text-sm">Waiting for host to continue...</p>
    </div>
  );
}
```

- [ ] **Step 3: Create PlayerFinal component**

```typescript
// src/components/player/PlayerFinal.tsx
"use client";

interface PlayerFinalProps {
  name: string;
  team: number;
  totalSurplus: number;
  rank: number | null;
  teamRank: number | null;
}

/**
 * Player final results screen.
 */
export default function PlayerFinal({
  name,
  team,
  totalSurplus,
  rank,
  teamRank,
}: PlayerFinalProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Market Mayhem</h1>
      <h2 className="text-xl text-gray-400">Game Over!</h2>

      <div className="bg-gray-900 rounded-xl p-8 text-center min-w-[280px]">
        <p className="text-gray-400 text-sm mb-1">{name} — Team {team}</p>
        <p className="text-5xl font-bold mt-2">${totalSurplus}</p>
        <p className="text-gray-400 text-sm mt-1">Total Consumer Surplus</p>
      </div>

      <div className="flex gap-6">
        {rank !== null && (
          <div className="bg-gray-900 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Your Rank</p>
            <p className="text-3xl font-bold">#{rank}</p>
          </div>
        )}
        {teamRank !== null && (
          <div className="bg-gray-900 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Team Rank</p>
            <p className="text-3xl font-bold">#{teamRank}</p>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-sm">Check the big screen for full results!</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/player/PlayerBidding.tsx src/components/player/PlayerReveal.tsx src/components/player/PlayerFinal.tsx
git commit -m "Add player bidding, reveal, and final components"
```

---

### Task 12: Host Page — Wire Up Auction Flow

**Files:**
- Rewrite: `src/app/host/[roomCode]/page.tsx`

- [ ] **Step 1: Rewrite the host page**

```typescript
// src/app/host/[roomCode]/page.tsx
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores, type TeamScore } from "@/lib/game-logic";
import type { ResolvedBid } from "@/lib/auction-logic";
import HostLobby from "@/components/host/HostLobby";
import HostBidding from "@/components/host/HostBidding";
import HostReveal from "@/components/host/HostReveal";
import HostFinal from "@/components/host/HostFinal";

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_phase: number;
  current_round: number;
  round_supply: number;
  phase_results: Array<{
    phase: number;
    producer_surplus: number;
    consumer_surplus: number;
    bids: ResolvedBid[];
  }>;
}

interface Player {
  id: string;
  name: string;
  team: number;
  current_bid: number | null;
  total_surplus: number;
}

interface RevealData {
  result: {
    sorted_bids: ResolvedBid[];
    producer_surplus: number;
    consumer_surplus: number;
  };
}

export default function HostPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [error, setError] = useState("");

  const hostToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`host_token_${roomCode}`)
      : null;

  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}`);
    if (res.ok) {
      const data = await res.json();
      setGame(data);
    } else {
      setError("Game not found");
    }
  }, [roomCode]);

  const fetchPlayers = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("id, name, team, current_bid, total_surplus")
      .eq("game_id", game.id)
      .order("created_at");
    if (data) {
      setPlayers(data);
    }
  }, [game?.id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayers();

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`host-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          setGame((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, fetchPlayers]);

  async function handleAdvance(action?: string) {
    if (!hostToken) {
      setError("Missing host token — are you the host?");
      return;
    }
    const res = await fetch(`/api/games/${roomCode}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to advance");
    } else {
      if (data.result) {
        setRevealData({ result: data.result });
      }
      if (data.status === "bidding") {
        setRevealData(null);
      }
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-xl">Loading...</p>
      </div>
    );
  }

  if (game.status === "lobby") {
    return <HostLobby roomCode={roomCode} players={players} onStart={() => handleAdvance()} />;
  }

  if (game.status === "bidding") {
    return (
      <HostBidding
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        players={players}
        onReveal={() => handleAdvance("reveal")}
      />
    );
  }

  if (game.status === "revealing" && revealData) {
    const isFinalRound = game.current_round === 2;
    const isLastPhase = game.current_phase === 2;

    return (
      <HostReveal
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        sortedBids={revealData.result.sorted_bids}
        producerSurplus={revealData.result.producer_surplus}
        consumerSurplus={revealData.result.consumer_surplus}
        isFinalRound={isFinalRound}
        isLastPhase={isLastPhase}
        onNextRound={() => handleAdvance("next_round")}
        onNextPhase={() => handleAdvance("next_phase")}
        onFinish={() => handleAdvance("finish")}
      />
    );
  }

  if (game.status === "revealing" && !revealData) {
    // Page refreshed during reveal — re-fetch by calling reveal again or show loading
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400">Bids were revealed but data was lost. Click to re-reveal.</p>
        <button
          onClick={() => handleAdvance("reveal")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl"
        >
          Re-reveal Bids
        </button>
      </div>
    );
  }

  if (game.status === "finished") {
    const teamScores = calculateTeamScores(
      players.map((p) => ({ team: p.team, score: p.total_surplus }))
    );
    const playerRankings = [...players]
      .sort((a, b) => b.total_surplus - a.total_surplus)
      .map((p) => ({ name: p.name, team: p.team, total_surplus: p.total_surplus }));

    return (
      <HostFinal
        phaseResults={game.phase_results}
        playerRankings={playerRankings}
        teamScores={teamScores}
      />
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/host/[roomCode]/page.tsx
git commit -m "Wire up host page for auction flow"
```

---

### Task 13: Player Page — Wire Up Auction Flow

**Files:**
- Rewrite: `src/app/play/[roomCode]/page.tsx`

- [ ] **Step 1: Rewrite the player page**

```typescript
// src/app/play/[roomCode]/page.tsx
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores } from "@/lib/game-logic";
import PlayerJoin from "@/components/player/PlayerJoin";
import PlayerBidding from "@/components/player/PlayerBidding";
import PlayerReveal from "@/components/player/PlayerReveal";
import PlayerFinal from "@/components/player/PlayerFinal";

interface Game {
  id: string;
  status: string;
  current_phase: number;
  current_round: number;
  round_supply: number;
  phase_results: Array<{
    phase: number;
    bids: Array<{ player_id: string; won: boolean; surplus: number; bid: number }>;
  }>;
}

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState(1);
  const [currentBid, setCurrentBid] = useState<number | null>(null);
  const [totalSurplus, setTotalSurplus] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [error, setError] = useState("");

  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}`);
    if (res.ok) {
      const data = await res.json();
      setGame(data);
    } else {
      setError("Game not found");
    }
  }, [roomCode]);

  const fetchPlayerData = useCallback(async () => {
    if (!playerId || !game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("current_bid, total_surplus")
      .eq("id", playerId)
      .single();
    if (data) {
      setCurrentBid(data.current_bid);
      setTotalSurplus(data.total_surplus);
    }
  }, [playerId, game?.id]);

  const fetchPlayerCount = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);
    if (data) setPlayerCount(data.length);
  }, [game?.id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayerData();
    fetchPlayerCount();

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`player-${game.id}-${playerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          setGame((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        (payload) => {
          const newData = payload.new as { current_bid: number | null; total_surplus: number };
          setCurrentBid(newData.current_bid);
          setTotalSurplus(newData.total_surplus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, playerId, fetchPlayerData, fetchPlayerCount]);

  // Reset local bid state when game transitions to bidding (new round)
  useEffect(() => {
    if (game?.status === "bidding") {
      fetchPlayerData();
    }
  }, [game?.status, game?.current_round, fetchPlayerData]);

  function handleJoined(id: string, name: string, team: number) {
    setPlayerId(id);
    setPlayerName(name);
    setPlayerTeam(team);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!playerId) {
    return <PlayerJoin roomCode={roomCode} onJoined={handleJoined} />;
  }

  if (game.status === "lobby") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <h1 className="text-3xl font-bold">Market Mayhem</h1>
        <p className="text-gray-400">Welcome, {playerName}! (Team {playerTeam})</p>
        <p className="text-gray-500">Waiting for host to start...</p>
      </div>
    );
  }

  if (game.status === "bidding") {
    return (
      <PlayerBidding
        roomCode={roomCode}
        playerId={playerId}
        phase={game.current_phase}
        round={game.current_round}
        supply={game.round_supply}
        playerCount={playerCount}
        currentBid={currentBid}
        onBidSubmitted={(bid) => setCurrentBid(bid)}
      />
    );
  }

  if (game.status === "revealing") {
    // Find this player's result from the latest phase_results or current reveal
    const latestPhaseResult = game.phase_results?.find(
      (r) => r.phase === game.current_phase
    );
    const isFinalRound = game.current_round === 2;

    let won = false;
    let bid = currentBid ?? 0;
    let surplus = 0;

    if (latestPhaseResult && isFinalRound) {
      const myBid = latestPhaseResult.bids.find((b) => b.player_id === playerId);
      if (myBid) {
        won = myBid.won;
        bid = myBid.bid;
        surplus = myBid.surplus;
      }
    } else {
      // For discovery rounds, we determine position from supply
      // We don't have the full sorted list on the player side,
      // but we get status from game. We need to fetch reveal info.
      // Simple approach: check if bid would be in buying zone
      // The advance endpoint doesn't store discovery round results,
      // so we use a simple heuristic — fetch all bids to check position.
      // Actually, for simplicity, let's check via realtime subscription.
      // We'll need to compute this. For now, show based on current_bid rank.
    }

    return (
      <PlayerReveal
        phase={game.current_phase}
        round={game.current_round}
        won={won}
        bid={bid}
        surplus={surplus}
        totalSurplus={totalSurplus}
        isFinalRound={isFinalRound}
      />
    );
  }

  if (game.status === "finished") {
    // Calculate ranks
    const supabase = getSupabaseBrowser();
    // We need ranks but can't call hooks conditionally, so compute from cached data
    return (
      <PlayerFinal
        name={playerName}
        team={playerTeam}
        totalSurplus={totalSurplus}
        rank={null}
        teamRank={null}
      />
    );
  }

  return null;
}
```

**Note:** The player reveal for discovery rounds (1-2) needs the player's position relative to the buy-line. Since the advance endpoint returns this data only to the host, we need a way for the player to know. The simplest approach is to store the reveal result in a game column or have the player fetch it. We'll handle this in Task 14.

- [ ] **Step 2: Commit**

```bash
git add src/app/play/[roomCode]/page.tsx
git commit -m "Wire up player page for auction flow"
```

---

### Task 14: Player Reveal — Fetch Bid Position for Discovery Rounds

The player needs to know if they're in or out of the buying zone after each round, including discovery rounds 1-2. The simplest approach: when bids are revealed, the player page fetches all bids for the game and computes its own position.

**Files:**
- Modify: `src/app/play/[roomCode]/page.tsx`

- [ ] **Step 1: Add bid position fetching to player page**

Add a `fetchRevealPosition` callback and state to the player page. After the game transitions to `revealing`, the player fetches all bids, sorts them, and checks if they're above or below the buy-line.

In `src/app/play/[roomCode]/page.tsx`, add state for reveal info:

```typescript
const [revealInfo, setRevealInfo] = useState<{ won: boolean; bid: number; surplus: number } | null>(null);
```

Add a fetch function after `fetchPlayerData`:

```typescript
const fetchRevealPosition = useCallback(async () => {
  if (!game?.id || !playerId) return;
  const supabase = getSupabaseBrowser();
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, current_bid")
    .eq("game_id", game.id)
    .order("current_bid", { ascending: false });

  if (!allPlayers) return;

  const sorted = allPlayers.sort((a, b) => (b.current_bid ?? 0) - (a.current_bid ?? 0));
  const myIndex = sorted.findIndex((p) => p.id === playerId);
  const myBid = sorted[myIndex]?.current_bid ?? 0;
  const won = myIndex < game.round_supply;
  const surplus = won ? 100 - myBid : 0;
  setRevealInfo({ won, bid: myBid, surplus });
}, [game?.id, game?.round_supply, playerId]);
```

Call it when status transitions to revealing:

```typescript
useEffect(() => {
  if (game?.status === "revealing") {
    fetchRevealPosition();
  }
  if (game?.status === "bidding") {
    setRevealInfo(null);
    fetchPlayerData();
  }
}, [game?.status, game?.current_round, fetchRevealPosition, fetchPlayerData]);
```

Update the revealing section to use `revealInfo`:

```typescript
if (game.status === "revealing") {
  const isFinalRound = game.current_round === 2;

  // For final round, prefer phase_results data (has actual surplus applied)
  if (isFinalRound) {
    const latestPhaseResult = game.phase_results?.find(
      (r) => r.phase === game.current_phase
    );
    if (latestPhaseResult) {
      const myBid = latestPhaseResult.bids.find((b) => b.player_id === playerId);
      if (myBid) {
        return (
          <PlayerReveal
            phase={game.current_phase}
            round={game.current_round}
            won={myBid.won}
            bid={myBid.bid}
            surplus={myBid.surplus}
            totalSurplus={totalSurplus}
            isFinalRound={true}
          />
        );
      }
    }
  }

  // For discovery rounds (or fallback), use fetched position
  if (revealInfo) {
    return (
      <PlayerReveal
        phase={game.current_phase}
        round={game.current_round}
        won={revealInfo.won}
        bid={revealInfo.bid}
        surplus={revealInfo.surplus}
        totalSurplus={totalSurplus}
        isFinalRound={isFinalRound}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">Loading results...</p>
    </div>
  );
}
```

Also fix the `finished` state to fetch ranks properly. Add rank fetching:

```typescript
const [rank, setRank] = useState<number | null>(null);
const [teamRank, setTeamRank] = useState<number | null>(null);

const fetchRanks = useCallback(async () => {
  if (!game?.id || !playerId) return;
  const supabase = getSupabaseBrowser();
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, team, total_surplus")
    .eq("game_id", game.id)
    .order("total_surplus", { ascending: false });

  if (!allPlayers) return;

  const myIndex = allPlayers.findIndex((p) => p.id === playerId);
  setRank(myIndex >= 0 ? myIndex + 1 : null);

  const teamScores = calculateTeamScores(
    allPlayers.map((p) => ({ team: p.team, score: p.total_surplus }))
  );
  const myTeamIndex = teamScores.findIndex((t) => t.team === playerTeam);
  setTeamRank(myTeamIndex >= 0 ? myTeamIndex + 1 : null);
}, [game?.id, playerId, playerTeam]);
```

Call it when game finishes:

```typescript
useEffect(() => {
  if (game?.status === "finished") {
    fetchRanks();
  }
}, [game?.status, fetchRanks]);
```

Update the finished section:

```typescript
if (game.status === "finished") {
  return (
    <PlayerFinal
      name={playerName}
      team={playerTeam}
      totalSurplus={totalSurplus}
      rank={rank}
      teamRank={teamRank}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/play/[roomCode]/page.tsx
git commit -m "Add player bid position fetching for reveal screens"
```

---

### Task 15: Update Home Page and Layout

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout metadata**

In `src/app/layout.tsx`, change:
```typescript
export const metadata: Metadata = {
  title: "Market Mayhem",
  description: "A classroom auction game demonstrating consumer surplus",
};
```

- [ ] **Step 2: Update home page branding**

In `src/app/page.tsx`, change the title and subtitle:
```typescript
<h1 className="text-5xl font-bold mb-2">Market Mayhem</h1>
<p className="text-gray-400 text-lg">The classroom auction game</p>
```

- [ ] **Step 3: Update PlayerJoin title**

In `src/components/player/PlayerJoin.tsx`, change:
```typescript
<h1 className="text-3xl font-bold mb-2">Market Mayhem</h1>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/components/player/PlayerJoin.tsx
git commit -m "Rename app to Market Mayhem"
```

---

### Task 16: Fix Advance Route — Surplus Update Without RPC

The advance route in Task 7 used an `increment_surplus` RPC that doesn't exist. Replace with a read-then-write approach.

**Files:**
- Modify: `src/app/api/games/[roomCode]/advance/route.ts`

- [ ] **Step 1: Replace the RPC surplus update with direct updates**

In the `bidding -> revealing` section where `current_round === 2`, replace the surplus update loop with:

```typescript
// Update each winner's total_surplus
for (const resolvedBid of result.sorted_bids) {
  if (resolvedBid.won && resolvedBid.surplus !== 0) {
    const currentPlayer = players.find((p) => p.id === resolvedBid.player_id);
    if (!currentPlayer) continue;

    // Fetch current total_surplus
    const { data: playerData } = await supabase
      .from("players")
      .select("total_surplus")
      .eq("id", resolvedBid.player_id)
      .single();

    if (playerData) {
      await supabase
        .from("players")
        .update({ total_surplus: playerData.total_surplus + resolvedBid.surplus })
        .eq("id", resolvedBid.player_id);
    }
  }
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/games/[roomCode]/advance/route.ts
git commit -m "Fix surplus update to use direct DB read/write"
```

---

### Task 17: Run Full Test Suite and Verify Build

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: all PASS.

- [ ] **Step 2: Run build**

```bash
npx next build
```
Expected: builds successfully with no errors.

- [ ] **Step 3: Fix any build errors**

Address any import errors from deleted files, type mismatches, etc.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Fix build errors and verify full test suite passes"
```
