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

  if (typeof body.bid !== "number" || body.bid < 0) {
    return NextResponse.json({ error: "Bid must be $0 or more" }, { status: 400 });
  }

  // Round to 2 decimal places to avoid floating point issues
  body.bid = Math.round(body.bid * 100) / 100;

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
    .update({ current_bid: body.bid, bid_updated_at: new Date().toISOString() })
    .eq("id", body.player_id)
    .eq("game_id", game.id)
    .select()
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "Failed to submit bid" }, { status: 500 });
  }

  return NextResponse.json({ bid: player.current_bid });
}
