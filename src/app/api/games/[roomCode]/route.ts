/** GET /api/games/[roomCode] — Returns the current game state. */
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
    .select("id, room_code, status, current_phase, current_round, round_supply, player_count, phase_results, created_at")
    .eq("room_code", roomCode)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game);
}
