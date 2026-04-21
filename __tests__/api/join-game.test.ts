import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockInsertSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from "@/app/api/games/[roomCode]/join/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/games/ABC123/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/games/[roomCode]/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins a game in lobby status", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: "game-uuid", status: "lobby" },
            error: null,
          }),
        }),
      }),
    }));

    mockFrom.mockImplementationOnce(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockInsertSelect.mockReturnValue({
          single: mockInsertSingle.mockResolvedValue({
            data: { id: "player-uuid", name: "Alice", team: 1 },
            error: null,
          }),
        }),
      }),
    }));

    const request = createRequest({ name: "Alice", team: 1 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.player_id).toBe("player-uuid");
    expect(body.name).toBe("Alice");
    expect(body.team).toBe(1);
  });

  it("rejects empty name", async () => {
    const request = createRequest({ name: "", team: 1 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });

  it("rejects invalid team", async () => {
    const request = createRequest({ name: "Alice", team: 3 });
    const response = await POST(request, { params: Promise.resolve({ roomCode: "ABC123" }) });
    expect(response.status).toBe(400);
  });
});
