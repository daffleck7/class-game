/**
 * Load test: simulates 60 players through a full Market Mayhem game.
 *
 * 3 phases (Monopoly, Oligopoly, Perfect Competition) x 3 rounds each.
 * Players submit random bids between $0-$120 each round.
 *
 * Usage: node scripts/load-test.mjs [base_url]
 * Default base_url: http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000";
const NUM_PLAYERS = 60;
const TEAMS = [1, 2, 4, 5, 6];
const PHASE_LABELS = ["Monopoly", "Oligopoly", "Perfect Competition"];

async function api(path, body) {
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const elapsed = Math.round(performance.now() - start);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(data)} [${elapsed}ms]`);
  }
  return { data, elapsed };
}

function randomBid() {
  // Random bid between $0.00 and $120.00
  return Math.round(Math.random() * 12000) / 100;
}

async function runBatch(label, tasks) {
  const start = performance.now();
  const results = await Promise.all(tasks.map((fn) => fn()));
  const totalMs = Math.round(performance.now() - start);
  const times = results.map((r) => r.elapsed);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const max = Math.max(...times);
  const min = Math.min(...times);
  console.log(`  ${label}: wall=${totalMs}ms | per-request avg=${avg}ms min=${min}ms max=${max}ms`);
  return results;
}

async function main() {
  console.log(`\nLoad test: ${NUM_PLAYERS} players against ${BASE}\n`);

  // 1. Create game
  console.log("--- Create Game ---");
  const { data: gameData, elapsed: createMs } = await api("/api/games", {});
  const roomCode = gameData.room_code;
  const hostToken = gameData.host_token;
  console.log(`  Room: ${roomCode} (${createMs}ms)`);

  // 2. Join 60 players
  console.log("\n--- Join Phase ---");
  const players = [];
  const joinResults = await runBatch(
    `${NUM_PLAYERS} players joining`,
    Array.from({ length: NUM_PLAYERS }, (_, i) => () =>
      api(`/api/games/${roomCode}/join`, {
        name: `Player${i + 1}`,
        team: TEAMS[i % TEAMS.length],
      })
    )
  );
  for (const r of joinResults) {
    players.push(r.data);
  }

  // 3. Host starts game (lobby -> bidding)
  console.log("\n--- Start Game ---");
  const { data: startData, elapsed: startMs } = await api(
    `/api/games/${roomCode}/advance`,
    { host_token: hostToken }
  );
  console.log(`  Host start: ${startMs}ms (supply: ${startData.supply})`);

  // 4. Play through 3 phases x 3 rounds
  for (let phase = 0; phase < 3; phase++) {
    console.log(`\n========== Phase ${phase + 1}: ${PHASE_LABELS[phase]} ==========`);

    for (let round = 0; round < 3; round++) {
      console.log(`\n--- ${PHASE_LABELS[phase]} — Round ${round + 1} of 3 ---`);

      // All players submit bids simultaneously
      await runBatch(
        `${NUM_PLAYERS} bids submitted`,
        players.map((p) => () =>
          api(`/api/games/${roomCode}/bid`, {
            player_id: p.player_id,
            bid: randomBid(),
          })
        )
      );

      // Host reveals bids
      const { data: revealData, elapsed: revealMs } = await api(
        `/api/games/${roomCode}/advance`,
        { host_token: hostToken, action: "reveal" }
      );
      const result = revealData.result;
      const winners = result.sorted_bids.filter((b) => b.won).length;
      const losers = result.sorted_bids.filter((b) => !b.won).length;
      console.log(`  Reveal: ${revealMs}ms — ${winners} winners, ${losers} losers`);
      console.log(`  Producer surplus: $${result.producer_surplus} | Consumer surplus: $${result.consumer_surplus}`);

      // Advance to next round, next phase, or finish
      if (round < 2) {
        // Next round within same phase
        const { elapsed: nextMs } = await api(
          `/api/games/${roomCode}/advance`,
          { host_token: hostToken, action: "next_round" }
        );
        console.log(`  Next round: ${nextMs}ms`);
      } else if (phase < 2) {
        // Next phase
        const { data: nextPhaseData, elapsed: nextMs } = await api(
          `/api/games/${roomCode}/advance`,
          { host_token: hostToken, action: "next_phase" }
        );
        console.log(`  Next phase: ${nextMs}ms (supply: ${nextPhaseData.supply})`);
      } else {
        // Finish game
        const { elapsed: finishMs } = await api(
          `/api/games/${roomCode}/advance`,
          { host_token: hostToken, action: "finish" }
        );
        console.log(`  Finish game: ${finishMs}ms`);
      }
    }
  }

  // 5. Fetch final game state
  console.log("\n--- Final Results ---");
  const { data: finalGame, elapsed: finalMs } = await api(`/api/games/${roomCode}`);
  console.log(`  Game state fetch: ${finalMs}ms`);
  console.log(`  Status: ${finalGame.status}`);
  console.log(`  Phases completed: ${finalGame.phase_results.length}`);

  for (const pr of finalGame.phase_results) {
    console.log(`  ${PHASE_LABELS[pr.phase]}: producer=$${pr.producer_surplus} consumer=$${pr.consumer_surplus}`);
  }

  console.log("\n✅ Load test complete!\n");
}

main().catch((err) => {
  console.error("\n❌ Load test failed:", err.message);
  process.exit(1);
});
