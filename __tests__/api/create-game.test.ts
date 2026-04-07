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
  });
});
