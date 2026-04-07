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
