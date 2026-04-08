import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { TEAMS } from "@/lib/teams";

interface JoinRequest {
  name?: string;
  team?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const body: JoinRequest = await request.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.team || !(TEAMS as readonly number[]).includes(body.team)) {
    return NextResponse.json({ error: "Team must be one of: 1, 2, 4, 5, 6" }, { status: 400 });
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

  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      name: body.name.trim(),
      team: body.team,
      score: 100,
      cash: 100,
    })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }

  return NextResponse.json(
    { player_id: player.id, name: player.name, team: player.team },
    { status: 201 }
  );
}
