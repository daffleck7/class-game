/** POST /api/games — Creates a new Market Mayhem game room. */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateRoomCode } from "@/lib/game-logic";
import crypto from "crypto";

export async function POST() {
  const supabase = createServerClient();
  const roomCode = generateRoomCode();
  const hostToken = crypto.randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("games")
    .insert({
      room_code: roomCode,
      host_token: hostToken,
      status: "lobby",
      current_phase: 0,
      current_round: 0,
      round_supply: 0,
      phase_results: [],
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
