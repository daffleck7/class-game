import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/advance/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/advance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[roomCode]/advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing host_token", async () => {
    const request = createRequest({});
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects invalid host_token", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: "g1", status: "lobby", host_token: "correct-token",
              current_phase: 0, current_round: 0, phase_results: [],
            },
            error: null,
          }),
        }),
      }),
    }));

    const request = createRequest({ host_token: "wrong-token" });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(403);
  });
});
