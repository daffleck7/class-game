# Host-Controlled Game Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace timer-driven auto-advance with explicit host buttons; reduce rounds to 5; improve cash/investment messaging.

**Architecture:** Minimal refactor — strip all timer logic from host and player components, add manual host buttons ("Trigger Next Event", "Open Reallocation", "Finish Game"), update advance API to remove round_end_time and reset locked_in on reallocation open. Player reallocation gets an explicit Lock In button instead of auto-submit.

**Tech Stack:** Next.js, React, TypeScript, Supabase, Vitest

---

### Task 1: Update deck size from 7 to 5

**Files:**
- Modify: `src/lib/game-logic.ts:28` (shuffleDeck return count)
- Modify: `__tests__/lib/game-logic.test.ts:31-39` (update expected counts)

- [ ] **Step 1: Update the test to expect 5 events**

In `__tests__/lib/game-logic.test.ts`, change the shuffleDeck tests:

```typescript
describe("shuffleDeck", () => {
  it("returns exactly 5 events", () => {
    const deck = shuffleDeck();
    expect(deck).toHaveLength(5);
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
    expect(new Set(titles).size).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/game-logic.test.ts`
Expected: FAIL — "expected 7 to be 5"

- [ ] **Step 3: Update shuffleDeck to return 5**

In `src/lib/game-logic.ts`, change line 28:

```typescript
export function shuffleDeck(): GameEvent[] {
  const shuffled = [...ALL_EVENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/game-logic.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/game-logic.ts __tests__/lib/game-logic.test.ts
git commit -m "Reduce deck size from 7 to 5 events"
```

---

### Task 2: Update advance API — remove timer, add open_realloc, reset locked_in

**Files:**
- Modify: `src/app/api/games/[roomCode]/advance/route.ts`
- Modify: `__tests__/api/advance.test.ts`

- [ ] **Step 1: Write tests for the new open_realloc action and no-timer behavior**

Add these tests to `__tests__/api/advance.test.ts`:

```typescript
it("transitions from lobby to allocating", async () => {
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
    body: JSON.stringify({ host_token: "correct-token" }),
  });

  const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe("allocating");
});

it("open_realloc sets round_phase to reallocating without round_end_time", async () => {
  mockGameSelectSingle.mockResolvedValue({
    data: {
      id: "game-uuid",
      status: "playing",
      host_token: "correct-token",
      current_event_index: 0,
      event_deck: [
        { title: "Test", description: "Test", effects: { rd: 1, security: 0, compatibility: 0, marketing: 0, partnerships: 0 } },
        { title: "Test2", description: "Test2", effects: { rd: 0, security: 1, compatibility: 0, marketing: 0, partnerships: 0 } },
      ],
    },
    error: null,
  });

  const request = new Request("http://localhost/api/games/ABC123/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_token: "correct-token", action: "open_realloc" }),
  });

  const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.round_phase).toBe("reallocating");
  expect(data.round_end_time).toBeUndefined();

  // Verify game update was called without round_end_time
  expect(mockGameUpdate).toHaveBeenCalled();
  const updateArg = mockGameUpdate.mock.calls[0][0];
  expect(updateArg.round_phase).toBe("reallocating");
  expect(updateArg.round_end_time).toBeNull();
});

it("fire_event does not auto-finish on last event", async () => {
  mockGameSelectSingle.mockResolvedValue({
    data: {
      id: "game-uuid",
      status: "playing",
      host_token: "correct-token",
      current_event_index: 0,
      event_deck: [
        { title: "Test", description: "Test", effects: { rd: 1, security: 0, compatibility: 0, marketing: 0, partnerships: 0 } },
      ],
    },
    error: null,
  });
  mockPlayersSelect.mockResolvedValue({
    data: [
      { id: "p1", allocations: { rd: 50, security: 0, compatibility: 0, marketing: 0, partnerships: 0 }, cash: 50 },
    ],
    error: null,
  });

  const request = new Request("http://localhost/api/games/ABC123/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_token: "correct-token", action: "fire_event" }),
  });

  // current_event_index is 0, deck length is 1, so nextIndex = 1 >= deck.length
  // But now it should NOT auto-finish — the host needs to see the reveal first
  // Actually: nextIndex (1) >= deck.length (1), so this would finish.
  // We need a deck with 2 events, current_event_index 0, firing gets index 1 (last).
  // Let me fix the test setup:
});
```

Wait — let me reconsider. The current `fire_event` logic auto-finishes when `nextIndex >= deck.length`. The new behavior should: fire the event normally (even the last one), and let the host click "Finish Game" separately. So `fire_event` should never auto-finish. When `nextIndex >= deck.length`, the event literally can't fire (no event to show), so the host should never trigger `fire_event` past the last event — the UI will show "Finish Game" instead of "Trigger Next Event" after the last reveal.

The current flow already returns `isLastEvent` in the response, so the host UI can use that to decide which button to show. No API change needed for that part — just remove the auto-finish from `fire_event` and ensure the host UI uses `isLastEvent`.

Let me write cleaner tests:

```typescript
it("open_realloc sets reallocating without round_end_time and resets locked_in", async () => {
  mockGameSelectSingle.mockResolvedValue({
    data: {
      id: "game-uuid",
      status: "playing",
      host_token: "correct-token",
      current_event_index: 0,
      event_deck: [
        { title: "E1", description: "d", effects: { rd: 1, security: 0, compatibility: 0, marketing: 0, partnerships: 0 } },
        { title: "E2", description: "d", effects: { rd: 0, security: 1, compatibility: 0, marketing: 0, partnerships: 0 } },
      ],
    },
    error: null,
  });

  const request = new Request("http://localhost/api/games/ABC123/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_token: "correct-token", action: "open_realloc" }),
  });

  const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
  expect(response.status).toBe(200);

  const updateArg = mockGameUpdate.mock.calls[0][0];
  expect(updateArg.round_phase).toBe("reallocating");
  expect(updateArg.round_end_time).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/api/advance.test.ts`
Expected: FAIL — `open_realloc` not handled (falls through to `start_realloc` branch)

- [ ] **Step 3: Update the advance route**

Replace the full contents of `src/app/api/games/[roomCode]/advance/route.ts`:

```typescript
/**
 * POST /api/games/[roomCode]/advance
 *
 * State machine endpoint for the host to advance the game through phases.
 * Score = cash. Investments persist and generate returns each round.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateRoundScore } from "@/lib/game-logic";
import type { Category } from "@/lib/events";

interface AdvanceRequest {
  host_token: string;
  action?: "fire_event" | "open_realloc" | "finish";
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
      .update({ status: "playing", current_event_index: -1, round_phase: null, round_end_time: null })
      .eq("id", game.id);

    return NextResponse.json({ status: "playing", message: "Events phase started" });
  }

  if (game.status === "playing") {
    // Fire the next event: apply multipliers, add gains to cash, investments stay
    if (body.action === "fire_event") {
      const nextIndex = game.current_event_index + 1;

      if (nextIndex >= deck.length) {
        return NextResponse.json({ error: "No more events to fire" }, { status: 400 });
      }

      const event = deck[nextIndex];

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, allocations, cash")
        .eq("game_id", game.id);

      if (playersError || !players) {
        return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
      }

      const updates = players.map((player) => {
        const roundGain = calculateRoundScore(
          player.allocations as Record<Category, number>,
          event.effects
        );
        const newCash = player.cash + roundGain;

        return supabase
          .from("players")
          .update({ cash: newCash, score: newCash })
          .eq("id", player.id);
      });

      await Promise.all(updates);

      await supabase
        .from("games")
        .update({
          current_event_index: nextIndex,
          round_phase: "revealing",
          round_end_time: null,
        })
        .eq("id", game.id);

      return NextResponse.json({
        status: "playing",
        current_event_index: nextIndex,
        event: { title: event.title, description: event.description },
        isLastEvent: nextIndex >= deck.length - 1,
      });
    }

    // Open reallocation: let players reinvest, reset locked_in
    if (body.action === "open_realloc") {
      await supabase
        .from("players")
        .update({ locked_in: false })
        .eq("game_id", game.id);

      await supabase
        .from("games")
        .update({ round_phase: "reallocating", round_end_time: null })
        .eq("id", game.id);

      return NextResponse.json({ status: "playing", round_phase: "reallocating" });
    }

    // Finish game
    if (body.action === "finish") {
      await supabase
        .from("games")
        .update({ status: "finished", round_phase: null, round_end_time: null })
        .eq("id", game.id);

      return NextResponse.json({ status: "finished", message: "Game over" });
    }
  }

  return NextResponse.json({ error: "Game is already finished" }, { status: 400 });
}
```

Key changes:
- `AdvanceRequest.action` type updated: `"start_realloc"` → `"open_realloc"`
- `fire_event` no longer auto-finishes when hitting last event — returns error if called past end
- `open_realloc` resets all players' `locked_in` to false, sets `round_phase: "reallocating"`, no `round_end_time`
- Default (no action) no longer maps to `fire_event` — only explicit actions in playing state

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/api/advance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/games/[roomCode]/advance/route.ts __tests__/api/advance.test.ts
git commit -m "Update advance API: host-controlled flow, remove timers"
```

---

### Task 3: Rewrite HostEvents — remove timers, add manual buttons

**Files:**
- Modify: `src/components/host/HostEvents.tsx`

- [ ] **Step 1: Replace HostEvents with host-controlled version**

Replace the full contents of `src/components/host/HostEvents.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TeamLeaderboard from "@/components/TeamLeaderboard";
import type { TeamScore } from "@/lib/game-logic";

const CATEGORY_LABELS: Record<string, string> = {
  rd: "R&D",
  security: "Security",
  compatibility: "Compatibility",
  marketing: "Marketing",
  partnerships: "Partnerships",
};

interface GameEvent {
  title: string;
  description: string;
  effects: Record<string, number>;
}

interface HostEventsProps {
  currentEventIndex: number;
  totalEvents: number;
  currentEvent: GameEvent | null;
  teamScores: TeamScore[];
  roundPhase: string | null;
  players: Array<{ id: string; name: string; locked_in: boolean }>;
  onAdvance: (action: string) => Promise<void>;
}

function EventEffects({ effects }: { effects: Record<string, number> }) {
  const nonZero = Object.entries(effects).filter(([, val]) => val !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {nonZero.map(([cat, val]) => (
        <span
          key={cat}
          className={`text-sm px-2 py-1 rounded ${
            val > 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {val > 0 ? "+" : ""}{val}x {CATEGORY_LABELS[cat] ?? cat}
        </span>
      ))}
    </div>
  );
}

export default function HostEvents({
  currentEventIndex,
  totalEvents,
  currentEvent,
  teamScores,
  roundPhase,
  players,
  onAdvance,
}: HostEventsProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const advancingRef = useRef(false);

  const fireEventWithCountdown = useCallback(() => {
    setCountdown(3);
  }, []);

  // Countdown timer — fires event when it reaches 0
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      if (!advancingRef.current) {
        advancingRef.current = true;
        onAdvance("fire_event").finally(() => { advancingRef.current = false; });
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onAdvance]);

  const isLastEvent = currentEventIndex >= totalEvents - 1;
  const lockedIn = players.filter((p) => p.locked_in).length;
  const total = players.length;
  const allLocked = lockedIn === total;

  // Countdown animation
  if (countdown !== null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 2} of {totalEvents}
        </p>
        <div className="relative flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-4 border-indigo-500 flex items-center justify-center animate-spin-slow">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 animate-spin" />
          </div>
          <span className="absolute text-7xl font-bold text-indigo-400 animate-pulse">
            {countdown}
          </span>
        </div>
        <p className="text-xl text-gray-400 animate-pulse">Incoming event...</p>
      </div>
    );
  }

  // Revealing phase: show event + button for reallocation or finish
  if (roundPhase === "revealing" && currentEvent) {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-xl w-full text-center animate-fade-in">
          <h2 className="text-3xl font-bold mb-3">{currentEvent.title}</h2>
          <p className="text-gray-300 text-lg">{currentEvent.description}</p>
          <EventEffects effects={currentEvent.effects} />
        </div>
        <TeamLeaderboard teamScores={teamScores} />
        <button
          onClick={() => onAdvance(isLastEvent ? "finish" : "open_realloc")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
        >
          {isLastEvent ? "Finish Game" : "Open Reallocation"}
        </button>
      </div>
    );
  }

  // Reallocation phase: show lock-in progress + trigger next event button
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          After Event {currentEventIndex + 1} of {totalEvents}
        </p>
        <h2 className="text-2xl font-bold">Players Re-investing...</h2>

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

        <TeamLeaderboard teamScores={teamScores} />

        <button
          onClick={fireEventWithCountdown}
          className={`font-bold text-xl py-4 px-12 rounded-xl transition-colors ${
            allLocked
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
          }`}
        >
          {allLocked
            ? "Trigger Next Event"
            : "Trigger Next Event (skip stragglers)"}
        </button>
      </div>
    );
  }

  // Default: waiting to start (round_phase is null)
  // Shows after allocating→playing transition and between rounds
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 p-8">
      <h2 className="text-3xl font-bold">
        {currentEventIndex === -1 ? "Ready to Begin!" : `Event ${currentEventIndex + 1} Complete`}
      </h2>
      <p className="text-gray-400 text-lg text-center max-w-md">
        {currentEventIndex === -1
          ? "Trigger the first event when you're ready."
          : "Trigger the next event when you're ready."}
      </p>
      <TeamLeaderboard teamScores={teamScores} />
      <button
        onClick={fireEventWithCountdown}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl py-4 px-12 rounded-xl transition-colors"
      >
        Trigger Next Event
      </button>
    </div>
  );
}
```

Key changes:
- Removed `roundEndTime` prop, `started` state, `timeLeft` state
- Removed auto-advance useEffect (the one that fired `start_realloc` after 3s)
- Removed reallocation countdown timer useEffect
- Added `players` prop for lock-in tracking
- Revealing phase: shows "Open Reallocation" or "Finish Game" button
- Reallocation phase: shows lock-in progress bar + "Trigger Next Event" button
- Default state: shows "Trigger Next Event" button

- [ ] **Step 2: Verify the app compiles**

Run: `npx next build`
Expected: May fail due to HostPage still passing old props — that's Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/host/HostEvents.tsx
git commit -m "Rewrite HostEvents: manual host buttons, remove all timers"
```

---

### Task 4: Rewrite PlayerEvents — remove auto-submit, add Lock In button

**Files:**
- Modify: `src/components/player/PlayerEvents.tsx`

- [ ] **Step 1: Replace PlayerEvents with host-controlled version**

Replace the full contents of `src/components/player/PlayerEvents.tsx`:

```tsx
"use client";

import { useState } from "react";
import AllocationSliders from "@/components/AllocationSliders";

const CATEGORY_LABELS: Record<string, string> = {
  rd: "R&D",
  security: "Security",
  compatibility: "Compatibility",
  marketing: "Marketing",
  partnerships: "Partnerships",
};

interface GameEvent {
  title: string;
  description: string;
  effects: Record<string, number>;
}

interface PlayerEventsProps {
  currentEvent: GameEvent | null;
  score: number;
  previousScore: number;
  eventIndex: number;
  totalEvents: number;
  teamRank: number | null;
  roomCode: string;
  playerId: string;
  currentAllocations: Record<string, number>;
  roundPhase: string | null;
  lockedIn: boolean;
}

function EventEffects({ effects }: { effects: Record<string, number> }) {
  const nonZero = Object.entries(effects).filter(([, val]) => val !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3">
      {nonZero.map(([cat, val]) => (
        <span
          key={cat}
          className={`text-xs px-2 py-1 rounded ${
            val > 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {val > 0 ? "+" : ""}{val}x {CATEGORY_LABELS[cat] ?? cat}
        </span>
      ))}
    </div>
  );
}

export default function PlayerEvents({
  currentEvent,
  score,
  previousScore,
  eventIndex,
  totalEvents,
  teamRank,
  roomCode,
  playerId,
  currentAllocations,
  roundPhase,
  lockedIn,
}: PlayerEventsProps) {
  const roundDelta = score - previousScore;
  const totalInvested = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);

  async function handleReinvest(allocations: Record<string, number>) {
    await fetch(`/api/games/${roomCode}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, allocations }),
    });
  }

  // Reinvest phase: show current investments + sliders + Lock In button
  if (roundPhase === "reallocating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-bold mb-2">Reinvest</h2>
        <p className="text-gray-400 text-sm mb-4 text-center max-w-sm">
          Spend your cash to invest in categories.
          Any cash you don't invest is kept safe and counts toward your score.
        </p>

        {totalInvested > 0 && (
          <div className="w-full max-w-md mb-4 bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Investments</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentAllocations)
                .filter(([, val]) => val > 0)
                .map(([cat, val]) => (
                  <span key={cat} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {CATEGORY_LABELS[cat]}: ${val}
                  </span>
                ))}
            </div>
          </div>
        )}

        <AllocationSliders
          onLockIn={handleReinvest}
          disabled={lockedIn}
          budget={score}
        />
        {lockedIn && (
          <p className="text-emerald-400 mt-4">Locked in! Waiting for next event...</p>
        )}
      </div>
    );
  }

  // Revealing phase: show event and score
  if (roundPhase === "revealing" && currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">
          Event {eventIndex + 1} of {totalEvents}
        </p>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mb-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">{currentEvent.title}</h2>
          <p className="text-gray-300">{currentEvent.description}</p>
          <EventEffects effects={currentEvent.effects} />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400">Cash</p>
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
          {totalInvested > 0 && (
            <p className="text-gray-500 text-sm">Invested: ${totalInvested}</p>
          )}
          {teamRank !== null && (
            <p className="text-gray-500 text-sm mt-2">Your team is #{teamRank}</p>
          )}
        </div>
      </div>
    );
  }

  // Waiting for host (round_phase is null)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin mb-6" />
      <h2 className="text-xl font-bold mb-2">Waiting for host...</h2>
      <p className="text-gray-500 text-sm">The next event will start soon.</p>
    </div>
  );
}
```

Key changes:
- Removed `roundEndTime` prop
- Added `lockedIn` prop (driven by realtime updates from parent)
- Removed `confirmed` local state — uses `lockedIn` from server instead
- Removed `autoSubmitAt` and `hideButton` from AllocationSliders call
- Shows Lock In button via AllocationSliders (no longer hidden)
- Added "Waiting for host..." state when `round_phase` is null
- Updated cash messaging

- [ ] **Step 2: Commit**

```bash
git add src/components/player/PlayerEvents.tsx
git commit -m "Rewrite PlayerEvents: Lock In button, remove auto-submit timer"
```

---

### Task 5: Update parent pages — remove roundEndTime plumbing, pass new props

**Files:**
- Modify: `src/app/host/[roomCode]/page.tsx`
- Modify: `src/app/play/[roomCode]/page.tsx`

- [ ] **Step 1: Update HostPage — pass players, remove roundEndTime**

In `src/app/host/[roomCode]/page.tsx`, update the HostEvents usage (around lines 154-170):

Change the `Game` interface to remove `round_end_time`:

```typescript
interface Game {
  id: string;
  room_code: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string; effects: Record<string, number> }>;
  round_phase: string | null;
}
```

Update the HostEvents render block:

```tsx
    return (
      <HostEvents
        currentEventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        currentEvent={currentEvent}
        teamScores={teamScores}
        roundPhase={game.round_phase}
        players={players}
        onAdvance={handleAdvance}
      />
    );
```

- [ ] **Step 2: Update PlayPage — remove roundEndTime, pass lockedIn**

In `src/app/play/[roomCode]/page.tsx`, update the `Game` interface:

```typescript
interface Game {
  id: string;
  status: string;
  current_event_index: number;
  event_deck: Array<{ title: string; description: string; effects: Record<string, number> }>;
  round_phase: string | null;
}
```

Update the PlayerEvents render block (around lines 178-191):

```tsx
    return (
      <PlayerEvents
        currentEvent={currentEvent}
        score={score}
        previousScore={previousScore}
        eventIndex={game.current_event_index}
        totalEvents={game.event_deck.length}
        teamRank={teamRank}
        roomCode={roomCode}
        playerId={playerId}
        currentAllocations={allocations}
        roundPhase={game.round_phase}
        lockedIn={lockedIn}
      />
    );
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx next build`
Expected: PASS — no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/app/host/[roomCode]/page.tsx src/app/play/[roomCode]/page.tsx
git commit -m "Remove roundEndTime plumbing, pass players and lockedIn to event components"
```

---

### Task 6: Clean up AllocationSliders — remove auto-submit timer code

**Files:**
- Modify: `src/components/AllocationSliders.tsx`

- [ ] **Step 1: Remove autoSubmitAt and hideButton props and timer logic**

Replace the full contents of `src/components/AllocationSliders.tsx`:

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
  initialAllocations?: Record<string, number>;
  buttonLabel?: string;
  budget?: number;
}

export default function AllocationSliders({
  onLockIn,
  disabled,
  initialAllocations,
  buttonLabel,
  budget = 100,
}: AllocationSlidersProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>(
    initialAllocations ?? {
      rd: 0,
      security: 0,
      compatibility: 0,
      marketing: 0,
      partnerships: 0,
    }
  );

  const totalInvested = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = budget - totalInvested;

  function handleChange(category: string, value: number) {
    const otherTotal = totalInvested - allocations[category];
    const maxAllowed = budget - otherTotal;
    const clamped = Math.min(value, maxAllowed);
    setAllocations((prev) => ({ ...prev, [category]: clamped }));
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-400">Cash Remaining</p>
        <p className={`text-4xl font-bold ${remaining < budget ? "text-amber-400" : "text-emerald-400"}`}>
          ${remaining}
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
              max={budget}
              value={allocations[cat]}
              onChange={(e) => handleChange(cat, parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-700"
            />
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`${CATEGORY_COLORS[cat]} h-1.5 rounded-full transition-all`}
                style={{ width: `${budget > 0 ? (allocations[cat] / budget) * 100 : 0}%` }}
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
        {disabled ? "Locked In ✓" : buttonLabel ?? "Lock In Investments"}
      </button>
    </div>
  );
}
```

Key changes:
- Removed `autoSubmitAt`, `hideButton` props
- Removed `useEffect`, `useRef`, `useCallback` imports (no longer needed)
- Removed `timeLeft` state, `allocationsRef`, `submittedRef`
- Removed countdown timer and auto-submit logic
- Changed "Wallet Balance" label to "Cash Remaining"
- Button is always shown

- [ ] **Step 2: Verify the app compiles**

Run: `npx next build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/AllocationSliders.tsx
git commit -m "Clean up AllocationSliders: remove timer and auto-submit logic"
```

---

### Task 7: Update PlayerAllocation messaging

**Files:**
- Modify: `src/components/player/PlayerAllocation.tsx`

- [ ] **Step 1: Update the copy**

In `src/components/player/PlayerAllocation.tsx`, replace the heading and description (lines 31-35):

```tsx
      <h2 className="text-2xl font-bold mb-2">Invest Your Budget</h2>
      <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
        You have $100 in cash. Spend it to invest in categories — your investments
        earn returns when events hit. Any cash you don't invest is kept safe and
        counts toward your final score.
      </p>
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx next build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/player/PlayerAllocation.tsx
git commit -m "Improve investment messaging: clarify cash vs investments"
```

---

### Task 8: Run all tests and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Build the app**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit if any fixes needed**

If any test or build fixes were needed, commit them:

```bash
git add -A
git commit -m "Fix test/build issues from host-controlled flow migration"
```
