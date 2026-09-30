const RUN_STATUSES = {
  OK: "OK",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
};

/**
 * Classify one run after parsing and feed-staleness evaluation.
 *
 * Important ordering:
 * 1. Parse failure
 * 2. Unknown status
 * 3. Failed run
 * 4. Any stale feed
 * 5. Otherwise OK
 *
 * A failed run returns immediately before feed data is inspected.
 */
export function classifyRun({ parseResult, feedResults = [] }) {
  /*
   * 1. Parse failure
   *
   * parseRun() returns { type: "unknown" } when the entry cannot
   * be validated. That must remain UNKNOWN.
   */
  if (!parseResult || parseResult.type === "unknown") {
    return {
      status: RUN_STATUSES.UNKNOWN,
      reason: parseResult?.reason ?? "run could not be parsed",
    };
  }

  const run = parseResult.data;

  /*
   * 2. Unknown status
   *
   * This is checked explicitly here as a defensive boundary.
   * Normally parseRun() will already reject unknown statuses.
   */
  if (run.status !== "ok" && run.status !== "fail") {
    return {
      status: RUN_STATUSES.UNKNOWN,
      reason: `unknown status: ${String(run.status)}`,
    };
  }

  /*
   * 3. Failed run
   *
   * This is unconditional.
   *
   * We return BEFORE looking at feedResults so a failed run
   * can never become PARTIAL or OK because of feed data.
   */
  if (run.status === "fail") {
    return {
      status: RUN_STATUSES.FAILED,
      reason: "run status is fail",
      error: run.error,
    };
  }

  /*
   * 4. Successful run with at least one stale feed
   *
   * Only feeds explicitly marked stale count.
   *
   * "not_evaluable" does not count as stale.
   * "fresh" does not count as stale.
   */
  const staleFeed = feedResults.find((feed) => feed && feed.status === "stale");

  if (staleFeed) {
    return {
      status: RUN_STATUSES.PARTIAL,
      reason: "one or more feeds are stale",
      stale_feeds: feedResults
        .filter((feed) => feed && feed.status === "stale")
        .map((feed) => feed.feed),
    };
  }

  /*
   * 5. Successful run with no stale feeds
   */
  return {
    status: RUN_STATUSES.OK,
    reason: "run succeeded and no evaluable feed is stale",
  };
}
