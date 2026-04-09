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

    // Open realloc phase: reset locked_in for all players, no timer
    if (body.action === "open_realloc") {
      await supabase.from("players").update({ locked_in: false }).eq("game_id", game.id);

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
