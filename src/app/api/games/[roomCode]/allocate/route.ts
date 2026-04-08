/**
 * POST /api/games/[roomCode]/allocate
 *
 * During initial allocation: sets investments from $100 budget. Score = remaining cash.
 * During reinvest (playing phase): adds to existing investments from available cash.
 * Investments persist — this endpoint only adds, never removes.
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

  const totalToInvest = CATEGORIES.reduce((sum, cat) => sum + body.allocations[cat], 0);

  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "allocating" && game.status !== "playing") {
    return NextResponse.json({ error: "Cannot allocate in this phase" }, { status: 400 });
  }

  // Initial allocation: set investments, score = cash = 100 - invested
  if (game.status === "allocating") {
    if (totalToInvest > 100) {
      return NextResponse.json({ error: "Total allocations exceed $100" }, { status: 400 });
    }

    const cash = 100 - totalToInvest;

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

  // Reinvest: add to existing investments from available cash
  const { data: currentPlayer, error: fetchError } = await supabase
    .from("players")
    .select("allocations, cash")
    .eq("id", body.player_id)
    .single();

  if (fetchError || !currentPlayer) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (totalToInvest > currentPlayer.cash) {
    return NextResponse.json(
      { error: `Total exceeds available cash of $${currentPlayer.cash}` },
      { status: 400 }
    );
  }

  const oldAllocations = currentPlayer.allocations as Record<Category, number>;
  const newAllocations: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    newAllocations[cat] = (oldAllocations[cat] || 0) + body.allocations[cat];
  }

  const newCash = currentPlayer.cash - totalToInvest;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .update({
      allocations: newAllocations,
      cash: newCash,
      score: newCash,
    })
    .eq("id", body.player_id)
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: "Failed to save allocations" }, { status: 500 });
  }

  return NextResponse.json({ score: player.score, cash: player.cash, locked_in: true });
}
