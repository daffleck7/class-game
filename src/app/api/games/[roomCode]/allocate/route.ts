/**
 * POST /api/games/[roomCode]/allocate
 *
 * Accepts a player's budget allocations across the 5 categories,
 * validates the totals, and persists them to the database.
 */

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
