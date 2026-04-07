# Icebreaker Investment Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Kahoot-style classroom icebreaker where players join teams via QR code, allocate a $100 budget across business categories, and compete as random events play out on a shared screen.

**Architecture:** Next.js App Router on Vercel with Supabase Postgres for game state and Supabase Realtime for live sync between host screen and player phones. All game logic (scoring, deck shuffling) runs server-side in API routes. Team scores use average wallet balance.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Supabase (Postgres + Realtime), qrcode.react, Tailwind CSS, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-04-07-icebreaker-game-design.md`

---

## File Map

```
class-game/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout with global styles
│   │   ├── page.tsx                            # Landing page — Host or Join
│   │   ├── host/[roomCode]/page.tsx            # Host screen (all phases)
│   │   ├── play/[roomCode]/page.tsx            # Player screen (all phases)
│   │   └── api/
│   │       ├── games/route.ts                  # POST: create game
│   │       └── games/[roomCode]/
│   │           ├── route.ts                    # GET: game state
│   │           ├── join/route.ts               # POST: join game
│   │           ├── allocate/route.ts           # POST: submit allocations
│   │           ├── advance/route.ts            # POST: advance phase/event
│   │           └── scores/route.ts             # GET: leaderboard data
│   ├── lib/
│   │   ├── supabase-server.ts                  # Supabase client for API routes
│   │   ├── supabase-browser.ts                 # Supabase client for browser (realtime)
│   │   ├── events.ts                           # Event deck definitions
│   │   └── game-logic.ts                       # Score calc, deck shuffling, room codes
│   └── components/
│       ├── host/
│       │   ├── HostLobby.tsx                   # QR code, player roster by team
│       │   ├── HostAllocation.tsx              # "Players are investing..." progress
│       │   ├── HostEvents.tsx                  # Event reveal + team leaderboard
│       │   └── HostFinal.tsx                   # Final results + MVPs
│       ├── player/
│       │   ├── PlayerJoin.tsx                  # Name + team form
│       │   ├── PlayerWaiting.tsx               # "Waiting for host..."
│       │   ├── PlayerAllocation.tsx            # Sliders + lock in
│       │   ├── PlayerEvents.tsx                # Event + personal score
│       │   └── PlayerFinal.tsx                 # Personal results
│       ├── TeamLeaderboard.tsx                 # Team rankings
│       ├── PlayerMVPs.tsx                      # MVP + per-team top scorers
│       ├── QRCode.tsx                          # QR code wrapper
│       └── AllocationSliders.tsx               # Budget sliders with wallet display
├── supabase/
│   └── migrations/
│       └── 001_create_tables.sql               # games + players tables, RLS
├── __tests__/
│   ├── lib/
│   │   ├── game-logic.test.ts                  # Unit tests for game logic
│   │   └── events.test.ts                      # Unit tests for event deck
│   └── api/
│       ├── create-game.test.ts                 # API route tests
│       ├── join-game.test.ts
│       ├── allocate.test.ts
│       └── advance.test.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── .env.example
└── .gitignore
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the full Next.js scaffold with Tailwind and App Router.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js qrcode.react
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
HOST_SECRET=replace-with-random-string
```

- [ ] **Step 6: Update .gitignore**

Append to `.gitignore`:

```
# Next.js
.next/
out/
node_modules/

# Environment
.env
.env.local

# Supabase
.superpowers/
```

- [ ] **Step 7: Replace root layout with clean starting point**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Blitz",
  description: "An interactive classroom icebreaker investment game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Verify build works**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js project with Tailwind, Vitest, and Supabase deps"
```

---

### Task 2: Supabase Migration & Client Setup

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`, `src/lib/supabase-server.ts`, `src/lib/supabase-browser.ts`

- [ ] **Step 1: Create SQL migration**

Create `supabase/migrations/001_create_tables.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Games table
create table games (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'allocating', 'playing', 'finished')),
  current_event_index int not null default -1,
  event_deck jsonb not null default '[]'::jsonb,
  host_token text not null,
  created_at timestamptz not null default now()
);

-- Players table
create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  team int not null check (team >= 1 and team <= 5),
  allocations jsonb not null default '{"rd": 0, "security": 0, "compatibility": 0, "marketing": 0, "partnerships": 0}'::jsonb,
  cash int not null default 100,
  score int not null default 100,
  locked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast player lookups by game
create index idx_players_game_id on players(game_id);

-- Enable realtime for both tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;

-- Row Level Security
alter table games enable row level security;
alter table players enable row level security;

-- Games: anyone can read, only API routes insert/update (via service role or anon with policies)
create policy "Games are readable by everyone"
  on games for select using (true);

create policy "Games can be inserted by anyone"
  on games for insert with check (true);

create policy "Games can be updated by anyone"
  on games for update using (true);

-- Players: anyone can read, insert, and update their own row
create policy "Players are readable by everyone"
  on players for select using (true);

create policy "Players can be inserted by anyone"
  on players for insert with check (true);

create policy "Players can be updated by anyone"
  on players for update using (true);
```

- [ ] **Step 2: Create server-side Supabase client**

Create `src/lib/supabase-server.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}
```

- [ ] **Step 3: Create browser-side Supabase client**

Create `src/lib/supabase-browser.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createClient(supabaseUrl, supabaseKey);
  return client;
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/ src/lib/supabase-server.ts src/lib/supabase-browser.ts
git commit -m "Add Supabase migration and client setup"
```

---

### Task 3: Game Logic — Event Deck & Scoring

**Files:**
- Create: `src/lib/events.ts`, `src/lib/game-logic.ts`, `__tests__/lib/events.test.ts`, `__tests__/lib/game-logic.test.ts`

- [ ] **Step 1: Write failing tests for event deck**

Create `__tests__/lib/events.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ALL_EVENTS, CATEGORIES } from "@/lib/events";

describe("event deck", () => {
  it("has exactly 10 events", () => {
    expect(ALL_EVENTS).toHaveLength(10);
  });

  it("every event has title, description, and effects for all 5 categories", () => {
    for (const event of ALL_EVENTS) {
      expect(event.title).toBeTruthy();
      expect(event.description).toBeTruthy();
      for (const cat of CATEGORIES) {
        expect(typeof event.effects[cat]).toBe("number");
      }
    }
  });

  it("defines exactly 5 categories", () => {
    expect(CATEGORIES).toEqual([
      "rd",
      "security",
      "compatibility",
      "marketing",
      "partnerships",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/events.test.ts`
Expected: FAIL — cannot find module `@/lib/events`

- [ ] **Step 3: Implement events.ts**

Create `src/lib/events.ts`:

```typescript
export const CATEGORIES = [
  "rd",
  "security",
  "compatibility",
  "marketing",
  "partnerships",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface GameEvent {
  title: string;
  description: string;
  effects: Record<Category, number>;
}

export const ALL_EVENTS: GameEvent[] = [
  {
    title: "Breakthrough Innovation",
    description: "Your R&D lab strikes gold with a revolutionary discovery.",
    effects: { rd: 2.5, security: 0, compatibility: 0, marketing: 0.5, partnerships: 0 },
  },
  {
    title: "Data Breach",
    description: "Hackers exploit companies with weak defenses.",
    effects: { rd: -0.5, security: 3.0, compatibility: 0, marketing: -1.0, partnerships: 0 },
  },
  {
    title: "Industry Standard Shift",
    description: "New compatibility requirements sweep the market.",
    effects: { rd: 0, security: 0, compatibility: 2.5, marketing: 0, partnerships: 1.0 },
  },
  {
    title: "Viral Campaign",
    description: "Your product goes viral on social media overnight.",
    effects: { rd: 0, security: 0, compatibility: 0.5, marketing: 3.0, partnerships: 0.5 },
  },
  {
    title: "Strategic Alliance",
    description: "A major industry player wants to partner with you.",
    effects: { rd: 0, security: 0, compatibility: 0.5, marketing: 0.5, partnerships: 3.0 },
  },
  {
    title: "Market Crash",
    description: "An economic downturn hits everyone hard.",
    effects: { rd: -0.5, security: 0.5, compatibility: 0, marketing: -1.5, partnerships: -1.0 },
  },
  {
    title: "Copycat Competitor",
    description: "A rival company clones your flagship product.",
    effects: { rd: 1.5, security: 0, compatibility: -1.0, marketing: 1.0, partnerships: -0.5 },
  },
  {
    title: "Government Regulation",
    description: "New compliance laws reshape the industry landscape.",
    effects: { rd: 0, security: 2.0, compatibility: 1.5, marketing: -0.5, partnerships: 0 },
  },
  {
    title: "Tech Conference Buzz",
    description: "The industry spotlight lands on your company.",
    effects: { rd: 0.5, security: 0, compatibility: 0.5, marketing: 1.5, partnerships: 1.5 },
  },
  {
    title: "Supply Chain Crisis",
    description: "A global disruption tests your key partnerships.",
    effects: { rd: -1.0, security: 0, compatibility: -0.5, marketing: 0, partnerships: 2.5 },
  },
];
```

- [ ] **Step 4: Run events tests to verify they pass**

Run: `npx vitest run __tests__/lib/events.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Write failing tests for game logic**

Create `__tests__/lib/game-logic.test.ts`:

```typescript
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
      { team: 1, averageScore: 125, playerCount: 2 },
      { team: 2, averageScore: 180, playerCount: 3 },
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
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/game-logic.test.ts`
Expected: FAIL — cannot find module `@/lib/game-logic`

- [ ] **Step 7: Implement game-logic.ts**

Create `src/lib/game-logic.ts`:

```typescript
import { ALL_EVENTS, CATEGORIES, type Category, type GameEvent } from "./events";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function shuffleDeck(): GameEvent[] {
  const shuffled = [...ALL_EVENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 7);
}

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

- [ ] **Step 8: Run all game logic tests**

Run: `npx vitest run __tests__/lib/`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/events.ts src/lib/game-logic.ts __tests__/lib/
git commit -m "Add event deck definitions and game logic with tests"
```

---

### Task 4: API Routes — Create Game & Join Game

**Files:**
- Create: `src/app/api/games/route.ts`, `src/app/api/games/[roomCode]/route.ts`, `src/app/api/games/[roomCode]/join/route.ts`
- Create: `__tests__/api/create-game.test.ts`, `__tests__/api/join-game.test.ts`

- [ ] **Step 1: Write failing test for create game**

Create `__tests__/api/create-game.test.ts`:

```typescript
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
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/create-game.test.ts`
Expected: FAIL — cannot find module `@/app/api/games/route`

- [ ] **Step 3: Implement POST /api/games**

Create `src/app/api/games/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateRoomCode, shuffleDeck } from "@/lib/game-logic";
import crypto from "crypto";

export async function POST() {
  const supabase = createServerClient();
  const roomCode = generateRoomCode();
  const hostToken = crypto.randomBytes(24).toString("hex");
  const eventDeck = shuffleDeck();

  const { data, error } = await supabase
    .from("games")
    .insert({
      room_code: roomCode,
      host_token: hostToken,
      event_deck: eventDeck,
      status: "lobby",
      current_event_index: -1,
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

- [ ] **Step 4: Run create game test**

Run: `npx vitest run __tests__/api/create-game.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for join game**

Create `__tests__/api/join-game.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelect = vi.fn();
const mockPlayerInsert = vi.fn();
const mockPlayerSelectSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "games") {
        return {
          select: () => ({
            eq: () => ({
              single: mockGameSelect,
            }),
          }),
        };
      }
      return {
        insert: mockPlayerInsert.mockReturnValue({
          select: () => ({
            single: mockPlayerSelectSingle,
          }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/join/route";

describe("POST /api/games/[roomCode]/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a player to an existing game in lobby status", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "lobby" },
      error: null,
    });
    mockPlayerSelectSingle.mockResolvedValue({
      data: { id: "player-uuid", name: "Alice", team: 2, score: 100 },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", team: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.player_id).toBe("player-uuid");
    expect(body.name).toBe("Alice");
  });

  it("rejects join if game is not in lobby status", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "playing" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", team: 1 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects join with missing name", async () => {
    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: 1 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects join with invalid team number", async () => {
    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Eve", team: 6 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run __tests__/api/join-game.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 7: Implement POST /api/games/[roomCode]/join**

Create `src/app/api/games/[roomCode]/join/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

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

  if (!body.team || body.team < 1 || body.team > 5) {
    return NextResponse.json({ error: "Team must be between 1 and 5" }, { status: 400 });
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
      score: 100,
      cash: 100,
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

- [ ] **Step 8: Implement GET /api/games/[roomCode]**

Create `src/app/api/games/[roomCode]/route.ts`:

```typescript
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
    .select("id, room_code, status, current_event_index, event_deck, created_at")
    .eq("room_code", roomCode)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game);
}
```

- [ ] **Step 9: Run all API tests**

Run: `npx vitest run __tests__/api/`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/ __tests__/api/
git commit -m "Add create game, get game, and join game API routes with tests"
```

---

### Task 5: API Routes — Allocate, Advance & Scores

**Files:**
- Create: `src/app/api/games/[roomCode]/allocate/route.ts`, `src/app/api/games/[roomCode]/advance/route.ts`, `src/app/api/games/[roomCode]/scores/route.ts`
- Create: `__tests__/api/allocate.test.ts`, `__tests__/api/advance.test.ts`

- [ ] **Step 1: Write failing test for allocate**

Create `__tests__/api/allocate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelect = vi.fn();
const mockPlayerUpdate = vi.fn();
const mockPlayerSelectSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "games") {
        return {
          select: () => ({
            eq: () => ({
              single: mockGameSelect,
            }),
          }),
        };
      }
      return {
        update: mockPlayerUpdate.mockReturnValue({
          eq: () => ({
            select: () => ({
              single: mockPlayerSelectSingle,
            }),
          }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/allocate/route";

describe("POST /api/games/[roomCode]/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid allocations that sum to <= 100", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });
    mockPlayerSelectSingle.mockResolvedValue({
      data: { id: "player-uuid", score: 20, cash: 20, locked_in: true },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: 20, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(200);
  });

  it("rejects allocations that sum to over 100", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: 50, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects negative allocations", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: -10, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/allocate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement POST /api/games/[roomCode]/allocate**

Create `src/app/api/games/[roomCode]/allocate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { CATEGORIES, type Category } from "@/lib/events";

interface AllocateRequest {
  player_id: string;
  allocations: Record<Category, number>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body: AllocateRequest = await request.json();

  if (!body.player_id || !body.allocations) {
    return NextResponse.json({ error: "player_id and allocations required" }, { status: 400 });
  }

  for (const cat of CATEGORIES) {
    const val = body.allocations[cat];
    if (typeof val !== "number" || val < 0) {
      return NextResponse.json({ error: `Invalid allocation for ${cat}` }, { status: 400 });
    }
  }

  const totalInvested = CATEGORIES.reduce((sum, cat) => sum + body.allocations[cat], 0);
  if (totalInvested > 100) {
    return NextResponse.json({ error: "Total allocations exceed $100" }, { status: 400 });
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

  if (game.status !== "allocating") {
    return NextResponse.json({ error: "Game is not in allocation phase" }, { status: 400 });
  }

  const cash = 100 - totalInvested;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .update({
      allocations: body.allocations,
      cash,
      score: cash,
      locked_in: true,
    })
    .eq("id", body.player_id)
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: "Failed to save allocations" }, { status: 500 });
  }

  return NextResponse.json({ score: player.score, cash: player.cash, locked_in: true });
}
```

- [ ] **Step 4: Run allocate tests**

Run: `npx vitest run __tests__/api/allocate.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Write failing test for advance**

Create `__tests__/api/advance.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelectSingle = vi.fn();
const mockGameUpdate = vi.fn();
const mockPlayersSelect = vi.fn();
const mockPlayerUpdate = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "games") {
        return {
          select: () => ({
            eq: () => ({
              single: mockGameSelectSingle,
            }),
          }),
          update: mockGameUpdate.mockReturnValue({
            eq: () => ({
              select: () => ({
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: mockPlayersSelect,
        }),
        update: mockPlayerUpdate.mockReturnValue({
          eq: () => ({ error: null }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/advance/route";

describe("POST /api/games/[roomCode]/advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without host_token", async () => {
    const request = new Request("http://localhost/api/games/ABC123/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects requests with wrong host_token", async () => {
    mockGameSelectSingle.mockResolvedValue({
      data: {
        id: "game-uuid",
        status: "lobby",
        host_token: "correct-token",
        current_event_index: -1,
        event_deck: [],
      },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: "wrong-token" }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run __tests__/api/advance.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement POST /api/games/[roomCode]/advance**

Create `src/app/api/games/[roomCode]/advance/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateRoundScore } from "@/lib/game-logic";
import type { Category } from "@/lib/events";

interface AdvanceRequest {
  host_token: string;
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
    .select("id, status, host_token, current_event_index, event_deck")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (body.host_token !== game.host_token) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 403 });
  }

  const deck = game.event_deck as Array<{
    title: string;
    description: string;
    effects: Record<Category, number>;
  }>;

  if (game.status === "lobby") {
    await supabase
      .from("games")
      .update({ status: "allocating" })
      .eq("id", game.id);

    return NextResponse.json({ status: "allocating", message: "Allocation phase started" });
  }

  if (game.status === "allocating") {
    await supabase
      .from("games")
      .update({ status: "playing", current_event_index: -1 })
      .eq("id", game.id);

    return NextResponse.json({ status: "playing", message: "Events phase started" });
  }

  if (game.status === "playing") {
    const nextIndex = game.current_event_index + 1;

    if (nextIndex >= deck.length) {
      await supabase
        .from("games")
        .update({ status: "finished" })
        .eq("id", game.id);

      return NextResponse.json({ status: "finished", message: "Game over" });
    }

    const event = deck[nextIndex];

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, allocations, score")
      .eq("game_id", game.id);

    if (playersError || !players) {
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
    }

    for (const player of players) {
      const roundScore = calculateRoundScore(
        player.allocations as Record<Category, number>,
        event.effects
      );
      const newScore = player.score + roundScore;

      await supabase
        .from("players")
        .update({ score: newScore })
        .eq("id", player.id);
    }

    await supabase
      .from("games")
      .update({ current_event_index: nextIndex })
      .eq("id", game.id);

    return NextResponse.json({
      status: "playing",
      current_event_index: nextIndex,
      event: { title: event.title, description: event.description },
    });
  }

  return NextResponse.json({ error: "Game is already finished" }, { status: 400 });
}
```

- [ ] **Step 8: Implement GET /api/games/[roomCode]/scores**

Create `src/app/api/games/[roomCode]/scores/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateTeamScores } from "@/lib/game-logic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, team, score")
    .eq("game_id", game.id)
    .order("score", { ascending: false });

  if (playersError) {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }

  const teamScores = calculateTeamScores(players || []);
  const mvp = players && players.length > 0 ? players[0] : null;

  const teamMvps: Record<number, { name: string; score: number }> = {};
  for (const player of players || []) {
    if (!teamMvps[player.team]) {
      teamMvps[player.team] = { name: player.name, score: player.score };
    }
  }

  return NextResponse.json({
    teamScores,
    players: players || [],
    mvp,
    teamMvps,
  });
}
```

- [ ] **Step 9: Run all API tests**

Run: `npx vitest run __tests__/api/`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/ __tests__/api/
git commit -m "Add allocate, advance, and scores API routes with tests"
```

---

### Task 6: Landing Page

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Implement the landing page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleHostGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/games", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`host_token_${data.room_code}`, data.host_token);
      router.push(`/host/${data.room_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }

  function handleJoinGame(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/play/${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">Budget Blitz</h1>
        <p className="text-gray-400 text-lg">The classroom investment game</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-xl">
        <div className="flex-1 bg-gray-900 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Host a Game</h2>
          <p className="text-gray-400 text-sm mb-6">
            Create a new game room and display it on the big screen.
          </p>
          <button
            onClick={handleHostGame}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </div>

        <div className="flex-1 bg-gray-900 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Join a Game</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter the room code shown on screen or scan the QR code.
          </p>
          <form onSubmit={handleJoinGame} className="flex flex-col gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ROOM CODE"
              maxLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-center text-lg font-mono uppercase placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add landing page with host and join options"
```

---

### Task 7: Shared Components

**Files:**
- Create: `src/components/QRCode.tsx`, `src/components/AllocationSliders.tsx`, `src/components/TeamLeaderboard.tsx`, `src/components/PlayerMVPs.tsx`

- [ ] **Step 1: Create QRCode component**

Create `src/components/QRCode.tsx`:

```tsx
"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  roomCode: string;
}

export default function QRCode({ roomCode }: QRCodeProps) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${roomCode}`
      : `/play/${roomCode}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-xl">
        <QRCodeSVG value={url} size={200} />
      </div>
      <p className="text-gray-400 text-sm break-all text-center max-w-xs">{url}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create AllocationSliders component**

Create `src/components/AllocationSliders.tsx`:

```tsx
"use client";

import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  rd: "R&D",
  security: "Security",
  compatibility: "Compatibility",
  marketing: "Marketing",
  partnerships: "Partnerships",
};

const CATEGORY_COLORS: Record<string, string> = {
  rd: "bg-blue-500",
  security: "bg-red-500",
  compatibility: "bg-green-500",
  marketing: "bg-yellow-500",
  partnerships: "bg-purple-500",
};

interface AllocationSlidersProps {
  onLockIn: (allocations: Record<string, number>) => void;
  disabled: boolean;
}

export default function AllocationSliders({ onLockIn, disabled }: AllocationSlidersProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({
    rd: 0,
    security: 0,
    compatibility: 0,
    marketing: 0,
    partnerships: 0,
  });

  const totalInvested = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const wallet = 100 - totalInvested;

  function handleChange(category: string, value: number) {
    const otherTotal = totalInvested - allocations[category];
    const maxAllowed = 100 - otherTotal;
    const clamped = Math.min(value, maxAllowed);
    setAllocations((prev) => ({ ...prev, [category]: clamped }));
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-400">Wallet Balance</p>
        <p className={`text-4xl font-bold ${wallet < 100 ? "text-amber-400" : "text-emerald-400"}`}>
          ${wallet}
        </p>
        <p className="text-sm text-gray-500 mt-1">Invested: ${totalInvested}</p>
      </div>

      <div className="space-y-4">
        {Object.keys(CATEGORY_LABELS).map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
              <span className="text-gray-400">${allocations[cat]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={allocations[cat]}
              onChange={(e) => handleChange(cat, parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-700"
            />
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`${CATEGORY_COLORS[cat]} h-1.5 rounded-full transition-all`}
                style={{ width: `${allocations[cat]}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onLockIn(allocations)}
        disabled={disabled}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {disabled ? "Locked In ✓" : "Lock In Investments"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create TeamLeaderboard component**

Create `src/components/TeamLeaderboard.tsx`:

```tsx
"use client";

import type { TeamScore } from "@/lib/game-logic";

const TEAM_COLORS = [
  "bg-red-600",
  "bg-blue-600",
  "bg-green-600",
  "bg-yellow-600",
  "bg-purple-600",
];

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];

interface TeamLeaderboardProps {
  teamScores: TeamScore[];
  highlight?: boolean;
}

export default function TeamLeaderboard({ teamScores, highlight }: TeamLeaderboardProps) {
  if (teamScores.length === 0) {
    return <p className="text-gray-500 text-center">No teams yet</p>;
  }

  const maxScore = Math.max(...teamScores.map((t) => t.averageScore), 1);

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {teamScores.map((ts, index) => (
        <div
          key={ts.team}
          className={`flex items-center gap-3 p-3 rounded-lg ${
            highlight && index === 0 ? "bg-yellow-900/30 ring-2 ring-yellow-500" : "bg-gray-900"
          }`}
        >
          <span className="text-2xl font-bold text-gray-500 w-8">#{index + 1}</span>
          <div
            className={`w-3 h-10 rounded ${TEAM_COLORS[ts.team - 1]}`}
          />
          <div className="flex-1">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">{TEAM_NAMES[ts.team - 1]}</span>
              <span className="text-sm text-gray-400">{ts.playerCount} players</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
              <div
                className={`${TEAM_COLORS[ts.team - 1]} h-2 rounded-full transition-all duration-700`}
                style={{ width: `${Math.max((ts.averageScore / maxScore) * 100, 2)}%` }}
              />
            </div>
          </div>
          <span className="text-xl font-bold w-16 text-right">${ts.averageScore}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create PlayerMVPs component**

Create `src/components/PlayerMVPs.tsx`:

```tsx
"use client";

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];

interface Player {
  name: string;
  score: number;
  team: number;
}

interface PlayerMVPsProps {
  mvp: Player | null;
  teamMvps: Record<number, { name: string; score: number }>;
}

export default function PlayerMVPs({ mvp, teamMvps }: PlayerMVPsProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {mvp && (
        <div className="text-center bg-yellow-900/20 border border-yellow-700 rounded-xl p-6">
          <p className="text-sm text-yellow-500 uppercase tracking-wider font-semibold">
            Overall MVP
          </p>
          <p className="text-3xl font-bold mt-2">{mvp.name}</p>
          <p className="text-yellow-400 text-xl mt-1">${mvp.score}</p>
          <p className="text-gray-400 text-sm mt-1">{TEAM_NAMES[mvp.team - 1]}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-3 text-center">
          Top Scorer Per Team
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(teamMvps).map(([teamStr, player]) => {
            const team = parseInt(teamStr);
            return (
              <div
                key={team}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-xs text-gray-500">{TEAM_NAMES[team - 1]}</p>
                  <p className="font-semibold">{player.name}</p>
                </div>
                <span className="text-emerald-400 font-bold">${player.score}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "Add shared components: QRCode, AllocationSliders, TeamLeaderboard, PlayerMVPs"
```

---

### Task 8: Host Screen

**Files:**
- Create: `src/app/host/[roomCode]/page.tsx`, `src/components/host/HostLobby.tsx`, `src/components/host/HostAllocation.tsx`, `src/components/host/HostEvents.tsx`, `src/components/host/HostFinal.tsx`

- [ ] **Step 1: Create HostLobby component**

Create `src/components/host/HostLobby.tsx`:

```tsx
"use client";

import QRCode from "@/components/QRCode";

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];
const TEAM_COLORS = [
  "border-red-600",
  "border-blue-600",
  "border-green-600",
  "border-yellow-600",
  "border-purple-600",
];

interface Player {
  id: string;
  name: string;
  team: number;
}

interface HostLobbyProps {
  roomCode: string;
  players: Player[];
  onStart: () => void;
}

export default function HostLobby({ roomCode, players, onStart }: HostLobbyProps) {
  const playersByTeam = new Map<number, Player[]>();
  for (const player of players) {
    const existing = playersByTeam.get(player.team) || [];
    existing.push(player);
    playersByTeam.set(player.team, existing);
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Budget Blitz</h1>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <QRCode roomCode={roomCode} />
        <div className="text-center">
          <p className="text-gray-400 text-sm">Room Code</p>
          <p className="text-5xl font-mono font-bold tracking-wider">{roomCode}</p>
          <p className="text-gray-400 mt-4">{players.length} player{players.length !== 1 ? "s" : ""} joined</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {[1, 2, 3, 4, 5].map((team) => (
          <div
            key={team}
            className={`border-l-4 ${TEAM_COLORS[team - 1]} bg-gray-900 rounded-lg p-4`}
          >
            <h3 className="font-semibold text-sm text-gray-400 mb-2">{TEAM_NAMES[team - 1]}</h3>
            <div className="space-y-1">
              {(playersByTeam.get(team) || []).map((p) => (
                <p key={p.id} className="text-sm">{p.name}</p>
              ))}
              {!(playersByTeam.get(team) || []).length && (
                <p className="text-xs text-gray-600 italic">No players yet</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={players.length < 2}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Start Game ({players.length} players)
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create HostAllocation component**

Create `src/components/host/HostAllocation.tsx`:

```tsx
"use client";

interface Player {
  id: string;
  name: string;
  locked_in: boolean;
}

interface HostAllocationProps {
  players: Player[];
  onAdvance: () => void;
}

export default function HostAllocation({ players, onAdvance }: HostAllocationProps) {
  const lockedIn = players.filter((p) => p.locked_in).length;
  const total = players.length;
  const allLocked = lockedIn === total;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-8">
      <h2 className="text-3xl font-bold">Players Are Investing...</h2>

      <div className="text-center">
        <p className="text-6xl font-bold">
          <span className="text-emerald-400">{lockedIn}</span>
          <span className="text-gray-600"> / {total}</span>
        </p>
        <p className="text-gray-400 mt-2">locked in</p>
      </div>

      <div className="w-full max-w-md bg-gray-800 rounded-full h-4">
        <div
          className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
          style={{ width: `${total > 0 ? (lockedIn / total) * 100 : 0}%` }}
        />
      </div>

      <button
        onClick={onAdvance}
        className={`font-bold text-xl py-4 px-12 rounded-xl transition-colors ${
          allLocked
            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
        }`}
      >
        {allLocked ? "Everyone's In — Start Events!" : "Start Events (skip stragglers)"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create HostEvents component**

Create `src/components/host/HostEvents.tsx`:

```tsx
"use client";

import TeamLeaderboard from "@/components/TeamLeaderboard";
import type { TeamScore } from "@/lib/game-logic";

interface GameEvent {
  title: string;
  description: string;
}

interface HostEventsProps {
  currentEventIndex: number;
  totalEvents: number;
  currentEvent: GameEvent | null;
  teamScores: TeamScore[];
  onNextEvent: () => void;
}

export default function HostEvents({
  currentEventIndex,
  totalEvents,
  currentEvent,
  teamScores,
  onNextEvent,
}: HostEventsProps) {
  const isLastEvent = currentEventIndex >= totalEvents - 1;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
      </div>

      {currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center">
          <h2 className="text-3xl font-bold mb-3">{currentEvent.title}</h2>
          <p className="text-gray-300 text-lg">{currentEvent.description}</p>
        </div>
      )}

      {!currentEvent && currentEventIndex === -1 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to Begin!</h2>
          <p className="text-gray-400">Click below to reveal the first event.</p>
        </div>
      )}

      <TeamLeaderboard teamScores={teamScores} />

      <button
        onClick={onNextEvent}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        {currentEventIndex === -1
          ? "Reveal First Event"
          : isLastEvent
            ? "Show Final Results"
            : "Next Event"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create HostFinal component**

Create `src/components/host/HostFinal.tsx`:

```tsx
"use client";

import TeamLeaderboard from "@/components/TeamLeaderboard";
import PlayerMVPs from "@/components/PlayerMVPs";
import type { TeamScore } from "@/lib/game-logic";

interface Player {
  name: string;
  score: number;
  team: number;
}

interface HostFinalProps {
  teamScores: TeamScore[];
  mvp: Player | null;
  teamMvps: Record<number, { name: string; score: number }>;
}

export default function HostFinal({ teamScores, mvp, teamMvps }: HostFinalProps) {
  const winner = teamScores.length > 0 ? teamScores[0] : null;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Game Over!</h1>

      {winner && (
        <div className="text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wider">Winner</p>
          <p className="text-5xl font-bold text-yellow-400 mt-2">
            Team {winner.team}
          </p>
          <p className="text-gray-400 mt-1">Average: ${winner.averageScore}</p>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-400 mb-4 text-center">Team Rankings</h3>
        <TeamLeaderboard teamScores={teamScores} highlight />
      </div>

      <div className="w-full max-w-2xl">
        <PlayerMVPs mvp={mvp} teamMvps={teamMvps} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create host page with realtime subscriptions**

Create `src/app/host/[roomCode]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores, type TeamScore } from "@/lib/game-logic";
import HostLobby from "@/components/host/HostLobby";
import HostAllocation from "@/components/host/HostAllocation";
import HostEvents from "@/components/host/HostEvents";
import HostFinal from "@/components/host/HostFinal";

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string }>;
}

interface Player {
  id: string;
  name: string;
  team: number;
  score: number;
  locked_in: boolean;
}

export default function HostPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [mvp, setMvp] = useState<Player | null>(null);
  const [teamMvps, setTeamMvps] = useState<Record<number, { name: string; score: number }>>({});
  const [error, setError] = useState("");

  const hostToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`host_token_${roomCode}`)
      : null;

  const fetchScores = useCallback(async () => {
    const res = await fetch(`/api/games/${roomCode}/scores`);
    if (res.ok) {
      const data = await res.json();
      setTeamScores(data.teamScores);
      setMvp(data.mvp);
      setTeamMvps(data.teamMvps);
    }
  }, [roomCode]);

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
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("id, name, team, score, locked_in")
      .eq("game_id", game?.id)
      .order("created_at");
    if (data) {
      setPlayers(data);
      setTeamScores(calculateTeamScores(data));
    }
  }, [game?.id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;
    fetchPlayers();
    fetchScores();

    const supabase = getSupabaseBrowser();

    const gameChannel = supabase
      .channel(`game-${game.id}`)
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
          fetchScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [game?.id, fetchPlayers, fetchScores]);

  async function handleAdvance() {
    if (!hostToken) {
      setError("Missing host token — are you the host?");
      return;
    }
    const res = await fetch(`/api/games/${roomCode}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to advance");
    } else {
      await fetchScores();
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
    return <HostLobby roomCode={roomCode} players={players} onStart={handleAdvance} />;
  }

  if (game.status === "allocating") {
    return <HostAllocation players={players} onAdvance={handleAdvance} />;
  }

  if (game.status === "playing") {
    const currentEvent =
      game.current_event_index >= 0
        ? game.event_deck[game.current_event_index]
        : null;

    return (
      <HostEvents
        currentEventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        currentEvent={currentEvent}
        teamScores={teamScores}
        onNextEvent={handleAdvance}
      />
    );
  }

  if (game.status === "finished") {
    return <HostFinal teamScores={teamScores} mvp={mvp} teamMvps={teamMvps} />;
  }

  return null;
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/host/ src/components/host/
git commit -m "Add host screen with all 4 game phases and realtime subscriptions"
```

---

### Task 9: Player Screen

**Files:**
- Create: `src/app/play/[roomCode]/page.tsx`, `src/components/player/PlayerJoin.tsx`, `src/components/player/PlayerWaiting.tsx`, `src/components/player/PlayerAllocation.tsx`, `src/components/player/PlayerEvents.tsx`, `src/components/player/PlayerFinal.tsx`

- [ ] **Step 1: Create PlayerJoin component**

Create `src/components/player/PlayerJoin.tsx`:

```tsx
"use client";

import { useState } from "react";

interface PlayerJoinProps {
  roomCode: string;
  onJoined: (playerId: string, name: string, team: number) => void;
}

export default function PlayerJoin({ roomCode, onJoined }: PlayerJoinProps) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/games/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onJoined(data.player_id, data.name, data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-2">Budget Blitz</h1>
      <p className="text-gray-400 mb-8">Room: {roomCode}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Choose Your Team</label>
          <select
            value={team}
            onChange={(e) => setTeam(parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-lg focus:outline-none focus:border-indigo-500"
          >
            <option value={1}>Team 1</option>
            <option value={2}>Team 2</option>
            <option value={3}>Team 3</option>
            <option value={4}>Team 4</option>
            <option value={5}>Team 5</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? "Joining..." : "Join Game"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerWaiting component**

Create `src/components/player/PlayerWaiting.tsx`:

```tsx
"use client";

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];

interface PlayerWaitingProps {
  name: string;
  team: number;
}

export default function PlayerWaiting({ name, team }: PlayerWaitingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="animate-pulse mb-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto" />
      </div>
      <h2 className="text-2xl font-bold mb-2">You're in, {name}!</h2>
      <p className="text-gray-400">{TEAM_NAMES[team - 1]}</p>
      <p className="text-gray-500 mt-4">Waiting for the host to start the game...</p>
    </div>
  );
}
```

- [ ] **Step 3: Create PlayerAllocation component**

Create `src/components/player/PlayerAllocation.tsx`:

```tsx
"use client";

import AllocationSliders from "@/components/AllocationSliders";

interface PlayerAllocationProps {
  roomCode: string;
  playerId: string;
  lockedIn: boolean;
  onLockedIn: () => void;
}

export default function PlayerAllocation({
  roomCode,
  playerId,
  lockedIn,
  onLockedIn,
}: PlayerAllocationProps) {
  async function handleLockIn(allocations: Record<string, number>) {
    const res = await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations }),
    });
    if (res.ok) {
      onLockedIn();
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-2">Invest Your Budget</h2>
      <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
        You have $100 in your wallet. Invest in categories to earn returns when events
        hit — but anything you invest leaves your wallet.
      </p>
      <AllocationSliders onLockIn={handleLockIn} disabled={lockedIn} />
      {lockedIn && (
        <p className="text-emerald-400 mt-4">Investments locked in! Waiting for events...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create PlayerEvents component**

Create `src/components/player/PlayerEvents.tsx`:

```tsx
"use client";

interface GameEvent {
  title: string;
  description: string;
}

interface PlayerEventsProps {
  currentEvent: GameEvent | null;
  score: number;
  previousScore: number;
  eventIndex: number;
  totalEvents: number;
  teamRank: number | null;
}

export default function PlayerEvents({
  currentEvent,
  score,
  previousScore,
  eventIndex,
  totalEvents,
  teamRank,
}: PlayerEventsProps) {
  const roundDelta = score - previousScore;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Event {eventIndex + 1} of {totalEvents}
      </p>

      {currentEvent && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mb-6">
          <h2 className="text-2xl font-bold mb-2">{currentEvent.title}</h2>
          <p className="text-gray-300">{currentEvent.description}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-gray-400">Your Wallet</p>
        <p className="text-5xl font-bold">${score}</p>
        {roundDelta !== 0 && (
          <p
            className={`text-xl font-semibold ${
              roundDelta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {roundDelta > 0 ? "+" : ""}${roundDelta}
          </p>
        )}
        {teamRank !== null && (
          <p className="text-gray-500 text-sm mt-2">Your team is #{teamRank}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create PlayerFinal component**

Create `src/components/player/PlayerFinal.tsx`:

```tsx
"use client";

const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"];

interface PlayerFinalProps {
  name: string;
  team: number;
  score: number;
  teamRank: number | null;
  playerRankInTeam: number | null;
}

export default function PlayerFinal({
  name,
  team,
  score,
  teamRank,
  playerRankInTeam,
}: PlayerFinalProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-3xl font-bold mb-6">Game Over!</h1>

      <div className="bg-gray-900 rounded-xl p-8 max-w-sm w-full space-y-4">
        <p className="text-gray-400">{name}</p>
        <p className="text-sm text-gray-500">{TEAM_NAMES[team - 1]}</p>

        <div>
          <p className="text-sm text-gray-400">Final Wallet</p>
          <p className="text-5xl font-bold text-emerald-400">${score}</p>
        </div>

        {teamRank !== null && (
          <div>
            <p className="text-sm text-gray-400">Team Rank</p>
            <p className="text-2xl font-bold">#{teamRank}</p>
          </div>
        )}

        {playerRankInTeam !== null && (
          <div>
            <p className="text-sm text-gray-400">Your Rank in Team</p>
            <p className="text-2xl font-bold">#{playerRankInTeam}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create player page with realtime subscriptions**

Create `src/app/play/[roomCode]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { calculateTeamScores } from "@/lib/game-logic";
import PlayerJoin from "@/components/player/PlayerJoin";
import PlayerWaiting from "@/components/player/PlayerWaiting";
import PlayerAllocation from "@/components/player/PlayerAllocation";
import PlayerEvents from "@/components/player/PlayerEvents";
import PlayerFinal from "@/components/player/PlayerFinal";

interface Game {
  id: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string }>;
}

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState(1);
  const [score, setScore] = useState(100);
  const [previousScore, setPreviousScore] = useState(100);
  const [lockedIn, setLockedIn] = useState(false);
  const [teamRank, setTeamRank] = useState<number | null>(null);
  const [playerRankInTeam, setPlayerRankInTeam] = useState<number | null>(null);
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

  const fetchPlayerScore = useCallback(async () => {
    if (!playerId || !game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single();
    if (data) {
      setPreviousScore(score);
      setScore(data.score);
    }
  }, [playerId, game?.id, score]);

  const fetchRanks = useCallback(async () => {
    if (!game?.id) return;
    const supabase = getSupabaseBrowser();
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, team, score")
      .eq("game_id", game.id)
      .order("score", { ascending: false });

    if (allPlayers) {
      const teamScores = calculateTeamScores(allPlayers);
      const myTeamIndex = teamScores.findIndex((t) => t.team === playerTeam);
      setTeamRank(myTeamIndex >= 0 ? myTeamIndex + 1 : null);

      const myTeamPlayers = allPlayers
        .filter((p) => p.team === playerTeam)
        .sort((a, b) => b.score - a.score);
      const myIndex = myTeamPlayers.findIndex((p) => p.id === playerId);
      setPlayerRankInTeam(myIndex >= 0 ? myIndex + 1 : null);
    }
  }, [game?.id, playerTeam, playerId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!game?.id) return;

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`player-${game.id}`)
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
          const newData = payload.new as { score: number; locked_in: boolean };
          setPreviousScore(score);
          setScore(newData.score);
          setLockedIn(newData.locked_in);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, playerId, score]);

  useEffect(() => {
    if (game?.status === "playing" || game?.status === "finished") {
      fetchPlayerScore();
      fetchRanks();
    }
  }, [game?.status, game?.current_event_index, fetchPlayerScore, fetchRanks]);

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
    return <PlayerWaiting name={playerName} team={playerTeam} />;
  }

  if (game.status === "allocating") {
    return (
      <PlayerAllocation
        roomCode={roomCode}
        playerId={playerId}
        lockedIn={lockedIn}
        onLockedIn={() => setLockedIn(true)}
      />
    );
  }

  if (game.status === "playing") {
    const currentEvent =
      game.current_event_index >= 0
        ? game.event_deck[game.current_event_index]
        : null;

    return (
      <PlayerEvents
        currentEvent={currentEvent}
        score={score}
        previousScore={previousScore}
        eventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        teamRank={teamRank}
      />
    );
  }

  if (game.status === "finished") {
    return (
      <PlayerFinal
        name={playerName}
        team={playerTeam}
        score={score}
        teamRank={teamRank}
        playerRankInTeam={playerRankInTeam}
      />
    );
  }

  return null;
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/play/ src/components/player/
git commit -m "Add player screen with join, allocation, events, and final phases"
```

---

### Task 10: Environment Config & Deployment

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Verify next.config.js is clean**

Read `next.config.js` (created by scaffolding). Ensure it has no issues. The default config from `create-next-app` should work as-is for Vercel. No changes needed unless the build revealed issues.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Test locally**

Run: `npm run dev`

Manual test checklist:
1. Open `http://localhost:3000` — landing page shows Host and Join options
2. Click "Create Game" — redirects to host screen with QR code (requires Supabase to be configured)
3. Open player URL on phone/another tab — join form shows
4. Enter name + team → join → shows waiting screen
5. Host clicks Start → players see allocation sliders
6. Player adjusts sliders, locks in → host sees progress
7. Host advances through events → leaderboard updates
8. Final screen shows team winner + MVPs

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Finalize project configuration for Vercel deployment"
```

- [ ] **Step 6: Deploy**

1. Push to GitHub: `git push origin main`
2. Go to vercel.com → Import the `class-game` repo
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `HOST_SECRET`
4. Deploy — Vercel auto-detects Next.js
5. Run the SQL migration in Supabase Dashboard → SQL Editor → paste `supabase/migrations/001_create_tables.sql`
6. In Supabase Dashboard → Database → Replication, ensure `games` and `players` tables have realtime enabled
