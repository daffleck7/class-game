/**
 * GET /api/games/[roomCode]/scores
 *
 * Returns individual player scores, team aggregates, the overall MVP,
 * and the top scorer per team.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateTeamScores } from "@/lib/game-logic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const supabase = createServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("room_code", roomCode)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, team, score")
    .eq("game_id", game.id)
    .order("score", { ascending: false });

  if (playersError) {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }

  const teamScores = calculateTeamScores(players || []);
  const mvp = players && players.length > 0 ? players[0] : null;

  const teamMvps: Record<number, { name: string; score: number }> = {};
  for (const player of players || []) {
    if (!teamMvps[player.team]) {
      teamMvps[player.team] = { name: player.name, score: player.score };
    }
  }

  return NextResponse.json({
    teamScores,
    players: players || [],
    mvp,
    teamMvps,
  });
}
