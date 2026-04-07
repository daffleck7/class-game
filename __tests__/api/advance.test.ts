import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGameSelectSingle = vi.fn();
const mockGameUpdate = vi.fn();
const mockPlayersSelect = vi.fn();
const mockPlayerUpdate = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "games") {
        return {
          select: () => ({
            eq: () => ({
              single: mockGameSelectSingle,
            }),
          }),
          update: mockGameUpdate.mockReturnValue({
            eq: () => ({
              select: () => ({
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: mockPlayersSelect,
        }),
        update: mockPlayerUpdate.mockReturnValue({
          eq: () => ({ error: null }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/advance/route";

describe("POST /api/games/[roomCode]/advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without host_token", async () => {
    const request = new Request("http://localhost/api/games/ABC123/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects requests with wrong host_token", async () => {
    mockGameSelectSingle.mockResolvedValue({
      data: {
        id: "game-uuid",
        status: "lobby",
        host_token: "correct-token",
        current_event_index: -1,
        event_deck: [],
      },
      error: null,
    });

    const request = new Request("http://localhost/api/games/ABC123/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: "wrong-token" }),
    });

    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(403);
  });
});
