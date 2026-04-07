import { describe, it, expect } from "vitest";
import { ALL_EVENTS, CATEGORIES } from "@/lib/events";

describe("event deck", () => {
  it("has exactly 10 events", () => {
    expect(ALL_EVENTS).toHaveLength(10);
  });

  it("every event has title, description, and effects for all 5 categories", () => {
    for (const event of ALL_EVENTS) {
      expect(event.title).toBeTruthy();
      expect(event.description).toBeTruthy();
      for (const cat of CATEGORIES) {
        expect(typeof event.effects[cat]).toBe("number");
      }
    }
  });

  it("defines exactly 5 categories", () => {
    expect(CATEGORIES).toEqual([
      "rd",
      "security",
      "compatibility",
      "marketing",
      "partnerships",
    ]);
  });
});
