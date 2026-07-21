import { describe, expect, it } from "vitest";
import { formatResetIn } from "./relative-time";

const NOW_MS = 1_750_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

describe("formatResetIn", () => {
  it("rounds up to whole minutes under an hour", () => {
    expect(formatResetIn(NOW_S + 23 * 60, NOW_MS)).toBe("23 min");
    expect(formatResetIn(NOW_S + 61, NOW_MS)).toBe("2 min");
  });

  it("switches to hours at or above 60 minutes", () => {
    expect(formatResetIn(NOW_S + 60 * 60, NOW_MS)).toBe("1 h");
    expect(formatResetIn(NOW_S + 90 * 60, NOW_MS)).toBe("2 h");
  });

  it("reports 'now' for a reset in the past or present", () => {
    expect(formatResetIn(NOW_S, NOW_MS)).toBe("now");
    expect(formatResetIn(NOW_S - 500, NOW_MS)).toBe("now");
  });
});
