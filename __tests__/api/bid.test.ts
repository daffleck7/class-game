import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/bid/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/bid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[roomCode]/bid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects negative bid", async () => {
    const request = createRequest({ player_id: "p1", bid: -5 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects missing player_id", async () => {
    const request = createRequest({ bid: 50 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("accepts a valid bid when game is in bidding status", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: "game-uuid", status: "bidding" },
            error: null,
          }),
        }),
      }),
    }));

    mockFrom.mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: "p1", current_bid: 75 },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    const request = createRequest({ player_id: "p1", bid: 75 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bid).toBe(75);
  });

  it("rejects bid when game is not in bidding status", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: "game-uuid", status: "revealing" },
            error: null,
          }),
        }),
      }),
    }));

    const request = createRequest({ player_id: "p1", bid: 50 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
