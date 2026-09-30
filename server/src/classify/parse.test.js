import { describe, it, expect } from "vitest";
import { parseRun } from "./parse.js";

function makeRun(started_at) {
  return {
    run: 200,
    started_at,
    status: "ok",
    error: null,
    counts: {
      seen: 1,
      new: 1,
      routed: 1,
      unrouted: 0,
    },
    feeds: {},
  };
}

describe("parseRun started_at validation", () => {
  it("accepts the exact ISO UTC timestamp used by the run log", () => {
    const result = parseRun(makeRun("2026-08-06T06:05:00Z"));

    expect(result.type).toBe("run");
  });

  it("rejects a date-only started_at", () => {
    const result = parseRun(makeRun("2026-08-06"));

    expect(result.type).toBe("unknown");
    expect(result.reason).toBe("started_at must be a valid UTC timestamp");
  });

  it("rejects a timestamp without Z", () => {
    const result = parseRun(makeRun("2026-08-06T06:05:00"));

    expect(result.type).toBe("unknown");
  });

  it("rejects a timestamp with a timezone offset", () => {
    const result = parseRun(makeRun("2026-08-06T06:05:00+05:30"));

    expect(result.type).toBe("unknown");
  });

  it("rejects an impossible calendar date", () => {
    const result = parseRun(makeRun("2026-02-31T06:05:00Z"));

    expect(result.type).toBe("unknown");
  });

  it("rejects an invalid month", () => {
    const result = parseRun(makeRun("2026-13-01T06:05:00Z"));

    expect(result.type).toBe("unknown");
  });

  it("rejects an invalid hour", () => {
    const result = parseRun(makeRun("2026-08-06T25:05:00Z"));

    expect(result.type).toBe("unknown");
  });
});
