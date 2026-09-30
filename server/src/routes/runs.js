import express from "express";
import { readRunLog } from "../services/runLogReader.js";
import { parseRun } from "../classify/parse.js";
import { evaluateFeedStaleness } from "../classify/feedstaleness.js";
import { classifyRun } from "../classify/classifyrun.js";
import config from "../../data/config.json" with { type: "json" };

const router = express.Router();

/**
 * Classify one entry from readRunLog().
 *
 * Feed data is only evaluated for a valid "ok" run.
 * This preserves the classifier rule that failed runs are
 * classified before touching feed data.
 */
function classifyEntry(entry) {
  // readRunLog() already identified this as an UNKNOWN entry.
  if (entry.type === "unknown") {
    const classification = classifyRun({
      parseResult: {
        type: "unknown",
        reason: entry.reason,
      },
      feedResults: [],
    });

    return {
      ...entry,
      classification: classification.status,
      classification_reason: classification.reason,
    };
  }

  // The JSON was parsed successfully, now validate its structure.
  const parseResult = parseRun(entry.data);

  // Parse/validation failure -> UNKNOWN.
  if (parseResult.type === "unknown") {
    const classification = classifyRun({
      parseResult,
      feedResults: [],
    });

    return {
      type: "unknown",
      line: entry.line,
      reason: parseResult.reason,
      raw: entry.data,
      classification: classification.status,
      classification_reason: classification.reason,
    };
  }

  const run = parseResult.data;

  /*
   * FAILED is classified immediately.
   *
   * No feed data is inspected here.
   */
  if (run.status === "fail") {
    const classification = classifyRun({
      parseResult,
      feedResults: [],
    });

    return {
      type: "run",
      line: entry.line,
      run: run.run,
      started_at: run.started_at,
      source_status: run.status,
      classification: classification.status,
      classification_reason: classification.reason,
      error: run.error,
      counts: run.counts,
      feeds: run.feeds,
      feed_results: [],
    };
  }

  /*
   * Valid "ok" run.
   *
   * Now it is appropriate to inspect feed freshness.
   */
  const runDate = run.started_at.slice(0, 10);

  const feedResults = Object.entries(run.feeds).map(([feedName, feed]) =>
    evaluateFeedStaleness({
      feedName,
      lastFile: feed.last_file,
      runDate,
      config,
    }),
  );

  const classification = classifyRun({
    parseResult,
    feedResults,
  });

  return {
    type: "run",
    line: entry.line,
    run: run.run,
    started_at: run.started_at,
    source_status: run.status,
    classification: classification.status,
    classification_reason: classification.reason,
    error: run.error,
    counts: run.counts,
    feeds: run.feeds,
    feed_results: feedResults,
  };
}

/**
 * GET /api/runs
 *
 * Returns every line as a classified entry.
 *
 * Invalid JSON / invalid structure stays visible as UNKNOWN.
 */
router.get("/runs", async (req, res, next) => {
  try {
    const entries = await readRunLog("data/run-log.jsonl");

    const classifiedRuns = entries.map(classifyEntry);

    res.json({
      runs: classifiedRuns,
      count: classifiedRuns.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/latest-good
 *
 * Returns the most recent OK or PARTIAL run.
 *
 * This endpoint exists specifically for the failed-day banner:
 *
 *   "No brief produced.
 *    Last good run: #X on <date>"
 *
 * FAILED and UNKNOWN runs are never returned here.
 */
router.get("/latest-good", async (req, res, next) => {
  try {
    const entries = await readRunLog("data/run-log.jsonl");

    const classifiedRuns = entries
      .map(classifyEntry)
      .filter(
        (entry) =>
          entry.type === "run" &&
          (entry.classification === "OK" || entry.classification === "PARTIAL"),
      );

    if (classifiedRuns.length === 0) {
      return res.json({
        run: null,
      });
    }

    /*
     * Use started_at rather than array position so the endpoint
     * is based on the run's actual timestamp.
     */
    classifiedRuns.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

    return res.json({
      run: classifiedRuns[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
