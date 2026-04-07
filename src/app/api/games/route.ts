import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateRoomCode, shuffleDeck } from "@/lib/game-logic";
import crypto from "crypto";

export async function POST() {
  const supabase = createServerClient();
  const roomCode = generateRoomCode();
  const hostToken = crypto.randomBytes(24).toString("hex");
  const eventDeck = shuffleDeck();

  const { data, error } = await supabase
    .from("games")
    .insert({
      room_code: roomCode,
      host_token: hostToken,
      event_deck: eventDeck,
      status: "lobby",
      current_event_index: -1,
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
