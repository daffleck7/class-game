/**
 * POST /api/games/[roomCode]/advance
 *
 * State machine endpoint for the host to advance the game through phases:
 * lobby → allocating → playing (with per-event score calculation) → finished.
 * Requires a valid host_token for authorization.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateRoundScore } from "@/lib/game-logic";
import type { Category } from "@/lib/events";

interface AdvanceRequest {
  host_token: string;
  action?: "fire_event" | "start_realloc" | "finish";
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
    // Action: fire the next event
    if (body.action === "fire_event" || !body.action) {
      const nextIndex = game.current_event_index + 1;

      if (nextIndex >= deck.length) {
        await supabase
          .from("games")
          .update({ status: "finished", round_phase: null, round_end_time: null })
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

      const updates = players.map((player) => {
        const roundScore = calculateRoundScore(
          player.allocations as Record<Category, number>,
          event.effects
        );
        const newScore = player.score + roundScore;

        return supabase
          .from("players")
          .update({ score: newScore })
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

    // Action: start reallocation phase (liquidate investments, set timer)
    if (body.action === "start_realloc") {
      const { data: players } = await supabase
        .from("players")
        .select("id, score")
        .eq("game_id", game.id);

      if (players) {
        const liquidateUpdates = players.map((player) =>
          supabase
            .from("players")
            .update({
              allocations: { rd: 0, security: 0, compatibility: 0, marketing: 0, partnerships: 0 },
              cash: player.score,
            })
            .eq("id", player.id)
        );
        await Promise.all(liquidateUpdates);
      }

      const endTime = new Date(Date.now() + 20000).toISOString();

      await supabase
        .from("games")
        .update({ round_phase: "reallocating", round_end_time: endTime })
        .eq("id", game.id);

      return NextResponse.json({ status: "playing", round_phase: "reallocating", round_end_time: endTime });
    }

    // Action: finish game immediately
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
