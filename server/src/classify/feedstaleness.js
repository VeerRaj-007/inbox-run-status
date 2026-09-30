const STATUS_FRESH = "fresh";
const STATUS_STALE = "stale";
const STATUS_NOT_EVALUABLE = "not_evaluable";

/**
 * Return the freshness threshold for one feed.
 *
 * Current config semantics:
 * - granola + meet use config.feed_freshness_threshold_days
 * - dropzone has no configured threshold yet
 *
 * This also supports a future per-feed config object without
 * changing the staleness calculation itself.
 */
function getThresholdDays(feedName, config) {
  const perFeedThresholds = config?.feed_freshness_thresholds;

  if (
    perFeedThresholds &&
    Object.prototype.hasOwnProperty.call(perFeedThresholds, feedName)
  ) {
    const value = perFeedThresholds[feedName];

    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  // The current config uses one threshold for granola and meet.
  if (feedName === "granola" || feedName === "meet") {
    const value = config?.feed_freshness_threshold_days;

    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  // Example: dropzone has no configured threshold.
  return null;
}

/**
 * Convert YYYY-MM-DD into a UTC date at midnight.
 *
 * Using date-only values avoids local-time/timezone effects.
 */
function parseDateOnly(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Reject impossible dates such as 2026-02-31.
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

/**
 * Calculate feed staleness.
 *
 * Stale when:
 *   ageInDays > thresholdDays
 *
 * An unconfigured threshold means the feed is NOT evaluable.
 * It is neither fresh nor stale.
 *
 * `files_seen` is intentionally ignored.
 */
export function evaluateFeedStaleness({ feedName, lastFile, runDate, config }) {
  const thresholdDays = getThresholdDays(feedName, config);

  // No threshold = we cannot evaluate this feed.
  if (thresholdDays === null) {
    return {
      feed: feedName,
      status: STATUS_NOT_EVALUABLE,
      stale: false,
      evaluable: false,
      threshold_days: null,
      last_file: lastFile,
      age_days: null,
      reason: "no freshness threshold configured",
    };
  }

  const lastFileDate = parseDateOnly(lastFile);
  const runDateOnly = parseDateOnly(runDate);

  if (!lastFileDate || !runDateOnly) {
    return {
      feed: feedName,
      status: STATUS_NOT_EVALUABLE,
      stale: false,
      evaluable: false,
      threshold_days: thresholdDays,
      last_file: lastFile,
      age_days: null,
      reason: "invalid date",
    };
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const ageDays = Math.floor(
    (runDateOnly.getTime() - lastFileDate.getTime()) / millisecondsPerDay,
  );

  // A future last_file should not be considered stale.
  const normalizedAgeDays = Math.max(0, ageDays);

  const stale = normalizedAgeDays > thresholdDays;

  return {
    feed: feedName,
    status: stale ? STATUS_STALE : STATUS_FRESH,
    stale,
    evaluable: true,
    threshold_days: thresholdDays,
    last_file: lastFile,
    age_days: normalizedAgeDays,
  };
}
