import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelect = vi.fn();
const mockPlayerInsert = vi.fn();
const mockPlayerSelectSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "games") {
        return {
          select: () => ({
            eq: () => ({
              single: mockGameSelect,
            }),
          }),
        };
      }
      return {
        insert: mockPlayerInsert.mockReturnValue({
          select: () => ({
            single: mockPlayerSelectSingle,
          }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/join/route";

describe("POST /api/games/[roomCode]/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a player to an existing game in lobby status", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "lobby" },
      error: null,
    });
    mockPlayerSelectSingle.mockResolvedValue({
      data: { id: "player-uuid", name: "Alice", team: 2, score: 100 },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", team: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.player_id).toBe("player-uuid");
    expect(body.name).toBe("Alice");
  });

  it("rejects join if game is not in lobby status", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "playing" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", team: 1 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects join with missing name", async () => {
    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: 1 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects join with invalid team number", async () => {
    const request = new Request("http://localhost/api/games/ABC123/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Eve", team: 6 }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
