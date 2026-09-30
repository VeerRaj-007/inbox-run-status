import express from "express";
import fs from "node:fs/promises";

import { readRunLog } from "../services/runLogReader.js";
import { parseRun } from "../classify/parse.js";
import { evaluateFeedStaleness } from "../classify/feedstaleness.js";
import { classifyRun } from "../classify/classifyrun.js";

import { RUN_LOG_FILE, CONFIG_FILE } from "../../dataPaths.js";

const router = express.Router();

/**
 * Read config.json from the root-level data directory.
 */
async function readConfig() {
  const rawConfig = await fs.readFile(CONFIG_FILE, "utf8");

  return JSON.parse(rawConfig);
}

/**
 * Classify one entry from readRunLog().
 */
function classifyEntry(entry, config) {
  // The reader already identified this line as UNKNOWN.
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

  // Validate the already-parsed JSON object.
  const parseResult = parseRun(entry.data);

  // Invalid/missing fields -> UNKNOWN.
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
   * FAILED is decided before feed data is inspected.
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
   * Only successful runs reach feed freshness evaluation.
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
 * Returns every classified run, including UNKNOWN entries.
 */
router.get("/runs", async (req, res, next) => {
  try {
    const [entries, config] = await Promise.all([
      readRunLog(RUN_LOG_FILE),
      readConfig(),
    ]);

    const classifiedRuns = entries.map((entry) => classifyEntry(entry, config));

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
 */
router.get("/latest-good", async (req, res, next) => {
  try {
    const [entries, config] = await Promise.all([
      readRunLog(RUN_LOG_FILE),
      readConfig(),
    ]);

    const classifiedRuns = entries
      .map((entry) => classifyEntry(entry, config))
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
