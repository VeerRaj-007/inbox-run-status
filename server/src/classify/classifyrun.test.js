import { describe, it, expect } from "vitest";

import { parseRun } from "./parse.js";
import { evaluateFeedStaleness } from "./feedstaleness.js";
import { classifyRun } from "./classifyrun.js";

const config = {
  feed_freshness_threshold_days: 3,
};

function makeRun({
  run,
  status = "ok",
  started_at = "2026-07-28T06:05:00Z",
  error = null,
  feeds = {},
  counts = {
    seen: 0,
    new: 0,
    routed: 0,
    unrouted: 0,
  },
}) {
  return {
    run,
    started_at,
    status,
    error,
    counts,
    feeds,
  };
}

function evaluateFeeds(feeds, startedAt) {
  const runDate = startedAt.slice(0, 10);

  return Object.entries(feeds).map(([feedName, feed]) =>
    evaluateFeedStaleness({
      feedName,
      lastFile: feed.last_file,
      runDate,
      config,
    }),
  );
}

describe("classifyRun", () => {
  it("run 131 is FAILED", () => {
    const run = makeRun({
      run: 131,
      status: "fail",
      started_at: "2026-08-06T06:05:00Z",
      error: "FileNotFoundError: feed directory missing",
      feeds: {
        granola: {
          last_file: "2026-08-06",
          files_seen: 0,
        },
        meet: {
          last_file: "2026-08-06",
          files_seen: 2,
        },
        dropzone: {
          last_file: "2026-08-01",
          files_seen: 0,
        },
      },
    });

    const parseResult = parseRun(run);

    const result = classifyRun({
      parseResult,
      feedResults: [],
    });

    expect(result.status).toBe("FAILED");
  });

  it("run 144 is FAILED", () => {
    const run = makeRun({
      run: 144,
      status: "fail",
      started_at: "2026-08-19T06:05:00Z",
      error: "FileNotFoundError: feed directory missing",
      feeds: {
        granola: {
          last_file: "2026-08-19",
          files_seen: 1,
        },
        meet: {
          last_file: "2026-08-19",
          files_seen: 2,
        },
        dropzone: {
          last_file: "2026-08-12",
          files_seen: 2,
        },
      },
    });

    const parseResult = parseRun(run);

    const result = classifyRun({
      parseResult,
      feedResults: [],
    });

    expect(result.status).toBe("FAILED");
  });

  describe("runs 121-129", () => {
    const partialRuns = [
      {
        run: 121,
        started_at: "2026-07-27T06:05:00Z",
        granola_last_file: "2026-07-18",
      },
      {
        run: 122,
        started_at: "2026-07-28T06:05:00Z",
        granola_last_file: "2026-07-19",
      },
      {
        run: 123,
        started_at: "2026-07-29T06:05:00Z",
        granola_last_file: "2026-07-20",
      },
      {
        run: 124,
        started_at: "2026-07-30T06:05:00Z",
        granola_last_file: "2026-07-21",
      },
      {
        run: 125,
        started_at: "2026-07-31T06:05:00Z",
        granola_last_file: "2026-07-22",
      },
      {
        run: 128,
        started_at: "2026-08-03T06:05:00Z",
        granola_last_file: "2026-07-25",
      },
      {
        run: 129,
        started_at: "2026-08-04T06:05:00Z",
        granola_last_file: "2026-07-26",
      },
    ];

    for (const item of partialRuns) {
      it(`run ${item.run} is PARTIAL because Granola is stale`, () => {
        const run = makeRun({
          run: item.run,
          started_at: item.started_at,
          status: "ok",
          feeds: {
            granola: {
              last_file: item.granola_last_file,
              files_seen: 0,
            },
            meet: {
              last_file: item.started_at.slice(0, 10),
              files_seen: 1,
            },
            dropzone: {
              last_file: "2026-07-01",
              files_seen: 0,
            },
          },
        });

        const parseResult = parseRun(run);

        const feedResults = evaluateFeeds(run.feeds, run.started_at);

        const granolaResult = feedResults.find(
          (feed) => feed.feed === "granola",
        );

        expect(granolaResult.status).toBe("stale");

        const result = classifyRun({
          parseResult,
          feedResults,
        });

        expect(result.status).toBe("PARTIAL");
      });
    }
  });

  it("garbage line gives UNKNOWN", () => {
    const parseResult = {
      type: "unknown",
      reason: "invalid JSON",
    };

    const result = classifyRun({
      parseResult,
      feedResults: [],
    });

    expect(result.status).toBe("UNKNOWN");
  });

  it("files_seen 0 with a fresh last_file is not stale", () => {
    const run = makeRun({
      run: 200,
      started_at: "2026-09-04T06:05:00Z",
      status: "ok",
      feeds: {
        granola: {
          last_file: "2026-09-04",
          files_seen: 0,
        },
      },
    });

    const feedResults = evaluateFeeds(run.feeds, run.started_at);

    expect(feedResults[0].status).toBe("fresh");
    expect(feedResults[0].stale).toBe(false);

    const parseResult = parseRun(run);

    const result = classifyRun({
      parseResult,
      feedResults,
    });

    expect(result.status).toBe("OK");
  });

  it("failed run stays FAILED even when a feed is stale", () => {
    const run = makeRun({
      run: 131,
      status: "fail",
      started_at: "2026-08-06T06:05:00Z",
      error: "FileNotFoundError: feed directory missing",
    });

    const parseResult = parseRun(run);

    const result = classifyRun({
      parseResult,
      feedResults: [
        {
          feed: "granola",
          status: "stale",
          stale: true,
        },
      ],
    });

    expect(result.status).toBe("FAILED");
  });
});
