# Host-Controlled Game Flow

**Date:** 2026-04-08
**Approach:** Minimal refactor (Approach A) — remove timers, add host buttons

## Summary

Replace the current timer-driven auto-advance event system with explicit host-controlled buttons. The host triggers each event, opens reallocation, and advances the game at their own pace. Players lock in explicitly with no countdown pressure.

Additionally reduce deck size from 7 to 5 rounds and improve player-facing messaging around cash vs. investments.

## Game Flow

```
LOBBY → ALLOCATING → PLAYING (5 rounds) → FINISHED

Each round:
  Host clicks "Trigger Next Event"
  → 3-2-1 countdown animation
  → Event revealed (round_phase: "revealing")
  → Host clicks "Open Reallocation"
  → Players reinvest and lock in (round_phase: "reallocating")
  → Host clicks "Trigger Next Event" (next round)

After final event reveal:
  → Host clicks "Finish Game" (no reallocation after last event)
```

## Host Screen States

| Game State | Host Sees | Button |
|---|---|---|
| `lobby` | Player list + QR code | "Start Game" (enabled when >= 2 players) |
| `allocating` | Lock-in progress bar | "Start Events" (green when all locked) / "Start Events (skip stragglers)" |
| `playing`, `round_phase: null` | Previous event card + leaderboard (or "Ready to Begin!" for first round) | "Trigger Next Event" |
| `playing`, countdown | 3-2-1 animation | No button |
| `playing`, `round_phase: "revealing"` | Event card + effects + leaderboard | "Open Reallocation" (or "Finish Game" after last event) |
| `playing`, `round_phase: "reallocating"` | Lock-in progress + leaderboard | "Trigger Next Event" (green when all locked) / "Trigger Next Event (skip stragglers)" |
| `finished` | Podium + rankings + MVPs | (existing end screen) |

## Player Screen States

| Game State | Player Sees |
|---|---|
| `allocating` | Investment sliders ($100 budget). Messaging: "Spend your cash to invest in categories. Any cash you don't invest is kept safe and counts toward your score." Lock In button. |
| `playing`, countdown | 3-2-1 animation |
| `playing`, `round_phase: "revealing"` | Event card + effects + updated cash + round delta + team rank |
| `playing`, `round_phase: "reallocating"` | Current investments + sliders to add more (budget = current cash). Same messaging about unspent cash. Lock In button. |
| `playing`, `round_phase: null` | "Waiting for host..." message |
| `finished` | Final screen (unchanged) |

## Investment Model (Unchanged)

- Investments are additive only — players cannot pull money out of a category
- During reallocation, slider budget = current cash
- `score = cash` (uninvested cash IS the score)
- `roundGain = SUM(allocation[cat] * effect[cat])` applied to cash each event

## Technical Changes

### 1. `src/lib/game-logic.ts`
- Change deck size from 7 to 5

### 2. `src/app/api/games/[roomCode]/advance/route.ts`
- Remove `round_end_time` logic from `start_realloc` action
- `open_realloc` action: set `round_phase: "reallocating"`, reset all players' `locked_in` to false
- After firing last event (index 4): stay in revealing phase, let host choose "Finish Game"

### 3. `src/components/host/HostEvents.tsx`
- Remove all timer logic (setTimeout auto-advances, countdown intervals, `round_end_time` tracking)
- Keep 3-2-1 countdown animation triggered by host button click
- Add explicit buttons: "Trigger Next Event", "Open Reallocation", "Finish Game"
- Show lock-in progress during reallocation phase (reuse HostAllocation pattern)
- "Skip stragglers" variant when not all players locked in

### 4. `src/components/player/PlayerEvents.tsx`
- Remove auto-submit timer logic and `autoSubmitAt` prop
- Add "Lock In" button for reallocation
- Add "Waiting for host..." state when `round_phase` is null

### 5. `src/components/player/PlayerAllocation.tsx`
- Update messaging: explain that spending cash = investing, and unspent cash counts toward score

### 6. `src/app/play/[roomCode]/page.tsx`
- Remove `round_end_time` references passed to player components

### 7. `src/app/host/[roomCode]/page.tsx`
- Remove `round_end_time` references passed to host components

### No Database Schema Changes
- `round_end_time` column stays but is no longer written to
