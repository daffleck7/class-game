import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

import { POST } from "@/app/api/games/route";

describe("POST /api/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a game and returns room_code and host_token", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "uuid-123",
        room_code: "ABC123",
        host_token: "token-xyz",
        status: "lobby",
      },
      error: null,
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.room_code).toBeTruthy();
    expect(body.host_token).toBeTruthy();
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.status).toBe("lobby");
    expect(insertArg.current_phase).toBe(0);
    expect(insertArg.current_round).toBe(0);
    expect(insertArg.phase_results).toEqual([]);
  });
});
