/**
 * POST /api/games/[roomCode]/advance
 *
 * State machine endpoint for the host to advance through auction phases.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { calculateSupply, resolveRound } from "@/lib/auction-logic";

interface AdvanceRequest {
  host_token: string;
  action?: "reveal" | "next_round" | "next_phase" | "finish";
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

  interface GameRow {
    id: string;
    status: string;
    host_token: string;
    current_phase: number;
    current_round: number;
    round_supply: number;
    phase_results: unknown[];
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, host_token, current_phase, current_round, round_supply, phase_results")
    .eq("room_code", roomCode)
    .single<GameRow>();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (body.host_token !== game.host_token) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 403 });
  }

  // LOBBY -> BIDDING (start game)
  if (game.status === "lobby") {
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);

    const playerCount = players?.length ?? 0;
    if (playerCount < 2) {
      return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });
    }

    const supply = calculateSupply(0, playerCount);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_phase: 0,
        current_round: 0,
        round_supply: supply,
      })
      .eq("id", game.id);

    return NextResponse.json({ status: "bidding", phase: 0, round: 0, supply });
  }

  // BIDDING -> REVEALING (reveal bids)
  if (game.status === "bidding" && body.action === "reveal") {
    const { data: players } = await supabase
      .from("players")
      .select("id, name, team, current_bid")
      .eq("game_id", game.id);

    if (!players) {
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
    }

    // Players who didn't bid are excluded from the auction — they can't win
    const bidders = players.filter((p) => p.current_bid !== null && p.current_bid > 0);
    const nonBidders = players.filter((p) => p.current_bid === null || p.current_bid <= 0);

    const bids = bidders.map((p) => ({
      player_id: p.id,
      name: p.name,
      team: p.team,
      bid: p.current_bid as number,
    }));

    const result = resolveRound(bids, game.round_supply);

    // Append non-bidders as losers at the bottom of the list
    for (const p of nonBidders) {
      result.sorted_bids.push({
        player_id: p.id,
        name: p.name,
        team: p.team,
        bid: 0,
        won: false,
        surplus: 0,
      });
    }

    // If this is round 3 (index 2), store phase results and update surplus
    if (game.current_round === 2) {
      const phaseResults = [...(game.phase_results as unknown[]), {
        phase: game.current_phase,
        supply: game.round_supply,
        producer_surplus: result.producer_surplus,
        consumer_surplus: result.consumer_surplus,
        bids: result.sorted_bids,
      }];

      await supabase
        .from("games")
        .update({ status: "revealing", phase_results: phaseResults })
        .eq("id", game.id);

      // Update each winner's total_surplus
      for (const resolvedBid of result.sorted_bids) {
        if (resolvedBid.won && resolvedBid.surplus !== 0) {
          const { data: playerData } = await supabase
            .from("players")
            .select("total_surplus")
            .eq("id", resolvedBid.player_id)
            .single();

          if (playerData) {
            await supabase
              .from("players")
              .update({ total_surplus: playerData.total_surplus + resolvedBid.surplus })
              .eq("id", resolvedBid.player_id);
          }
        }
      }
    } else {
      await supabase
        .from("games")
        .update({ status: "revealing" })
        .eq("id", game.id);
    }

    return NextResponse.json({
      status: "revealing",
      round: game.current_round,
      phase: game.current_phase,
      result,
    });
  }

  // REVEALING -> BIDDING (next round within same phase)
  if (game.status === "revealing" && body.action === "next_round") {
    if (game.current_round >= 2) {
      return NextResponse.json({ error: "No more rounds in this phase" }, { status: 400 });
    }

    await supabase
      .from("players")
      .update({ current_bid: null })
      .eq("game_id", game.id);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_round: game.current_round + 1,
      })
      .eq("id", game.id);

    return NextResponse.json({
      status: "bidding",
      phase: game.current_phase,
      round: game.current_round + 1,
    });
  }

  // REVEALING -> BIDDING (next phase)
  if (game.status === "revealing" && body.action === "next_phase") {
    if (game.current_phase >= 2) {
      return NextResponse.json({ error: "No more phases" }, { status: 400 });
    }

    const nextPhase = game.current_phase + 1;

    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", game.id);

    const playerCount = players?.length ?? 0;
    const supply = calculateSupply(nextPhase, playerCount);

    await supabase
      .from("players")
      .update({ current_bid: null })
      .eq("game_id", game.id);

    await supabase
      .from("games")
      .update({
        status: "bidding",
        current_phase: nextPhase,
        current_round: 0,
        round_supply: supply,
      })
      .eq("id", game.id);

    return NextResponse.json({
      status: "bidding",
      phase: nextPhase,
      round: 0,
      supply,
    });
  }

  // REVEALING -> FINISHED
  if (game.status === "revealing" && body.action === "finish") {
    await supabase
      .from("games")
      .update({ status: "finished" })
      .eq("id", game.id);

    return NextResponse.json({ status: "finished" });
  }

  return NextResponse.json({ error: "Invalid action for current game state" }, { status: 400 });
}
