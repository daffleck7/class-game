import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelect = vi.fn();
const mockPlayerUpdate = vi.fn();
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
        update: mockPlayerUpdate.mockReturnValue({
          eq: () => ({
            select: () => ({
              single: mockPlayerSelectSingle,
            }),
          }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/allocate/route";

describe("POST /api/games/[roomCode]/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid allocations that sum to <= 100", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });
    mockPlayerSelectSingle.mockResolvedValue({
      data: { id: "player-uuid", score: 20, cash: 20, locked_in: true },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: 20, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(200);
  });

  it("rejects allocations that sum to over 100", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: 50, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects negative allocations", async () => {
    mockGameSelect.mockResolvedValue({
      data: { id: "game-uuid", status: "allocating" },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: "player-uuid",
        allocations: { rd: -10, security: 30, compatibility: 10, marketing: 25, partnerships: 15 },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
