/**
 * Load test: simulates 60 players through a full game cycle.
 *
 * Usage: node scripts/load-test.mjs [base_url]
 * Default base_url: http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000";
const NUM_PLAYERS = 60;
const TEAMS = [1, 2, 4, 5, 6];

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

function randomAllocation(budget) {
  const cats = ["rd", "security", "compatibility", "marketing", "partnerships"];
  const alloc = { rd: 0, security: 0, compatibility: 0, marketing: 0, partnerships: 0 };
  let remaining = Math.floor(budget * 0.7); // invest ~70%
  for (let i = 0; i < cats.length - 1; i++) {
    const amount = Math.floor(Math.random() * (remaining / (cats.length - i)));
    alloc[cats[i]] = amount;
    remaining -= amount;
  }
  alloc[cats[cats.length - 1]] = remaining;
  return alloc;
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

  // 3. Host starts → allocating
  console.log("\n--- Allocation Phase ---");
  const { elapsed: startMs } = await api(`/api/games/${roomCode}/advance`, {
    host_token: hostToken,
  });
  console.log(`  Host start: ${startMs}ms`);

  // 4. All 60 players allocate simultaneously
  await runBatch(
    `${NUM_PLAYERS} players allocating`,
    players.map((p) => () =>
      api(`/api/games/${roomCode}/allocate`, {
        player_id: p.player_id,
        allocations: randomAllocation(100),
      })
    )
  );

  // 5. Host starts events
  const { elapsed: eventsMs } = await api(`/api/games/${roomCode}/advance`, {
    host_token: hostToken,
  });
  console.log(`  Host start events: ${eventsMs}ms`);

  // 6. Fire 5 events with reallocation between each
  const { data: gameState } = await api(`/api/games/${roomCode}`);
  const deckSize = gameState.event_deck.length;
  console.log(`  Deck size: ${deckSize} events`);

  for (let round = 0; round < deckSize; round++) {
    console.log(`\n--- Round ${round + 1} of ${deckSize} ---`);

    // Fire event
    const { data: eventData, elapsed: fireMs } = await api(
      `/api/games/${roomCode}/advance`,
      { host_token: hostToken, action: "fire_event" }
    );
    console.log(`  Fire event: ${fireMs}ms — "${eventData.event?.title}" (isLast=${eventData.isLastEvent})`);

    if (eventData.isLastEvent) {
      // Finish game after last event
      console.log("\n--- Finishing Game ---");
      const { elapsed: finishMs } = await api(`/api/games/${roomCode}/advance`, {
        host_token: hostToken,
        action: "finish",
      });
      console.log(`  Finish: ${finishMs}ms`);
      break;
    }

    // Open reallocation
    const { elapsed: reallocMs } = await api(`/api/games/${roomCode}/advance`, {
      host_token: hostToken,
      action: "open_realloc",
    });
    console.log(`  Open realloc: ${reallocMs}ms`);

    // Fetch current player cash to know budgets
    const { data: currentGame } = await api(`/api/games/${roomCode}`);

    // All 60 players reallocate (invest small amounts from remaining cash)
    await runBatch(
      `${NUM_PLAYERS} players reallocating`,
      players.map((p) => async () => {
        // Fetch player's current cash first
        const playerRes = await fetch(
          `${BASE}/api/games/${roomCode}`,
        );
        // Use a small fixed allocation to avoid exceeding cash
        const smallAlloc = { rd: 1, security: 1, compatibility: 1, marketing: 1, partnerships: 1 };
        return api(`/api/games/${roomCode}/allocate`, {
          player_id: p.player_id,
          allocations: smallAlloc,
        });
      })
    );
  }

  // 7. Fetch final scores
  console.log("\n--- Final Scores ---");
  const { data: scores, elapsed: scoresMs } = await api(
    `/api/games/${roomCode}/scores`
  );
  console.log(`  Scores endpoint: ${scoresMs}ms`);
  console.log(`  Teams: ${scores.teamScores.length}`);
  console.log(`  MVP: ${scores.mvp?.name} ($${scores.mvp?.score})`);
  for (const team of scores.teamScores) {
    console.log(`    Team ${team.team}: avg=$${team.averageScore} (${team.playerCount} players)`);
  }

  console.log("\n✅ Load test complete!\n");
}

main().catch((err) => {
  console.error("\n❌ Load test failed:", err.message);
  process.exit(1);
});
