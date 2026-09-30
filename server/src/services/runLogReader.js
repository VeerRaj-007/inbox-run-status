import fs from "node:fs";
import readline from "node:readline";

/**
 * Required structure for a valid run-log entry.
 *
 * A field being present is not enough for nested objects:
 * we also validate the fields we depend on later.
 */
function validateRunEntry(entry) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return "entry must be a JSON object";
  }

  // Top-level required fields
  const requiredFields = [
    "run",
    "started_at",
    "status",
    "error",
    "counts",
    "feeds",
  ];

  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(entry, field)) {
      return `missing required field: ${field}`;
    }
  }

  // Basic top-level validation
  if (!Number.isInteger(entry.run)) {
    return "run must be an integer";
  }

  if (typeof entry.started_at !== "string" || entry.started_at.length === 0) {
    return "started_at must be a non-empty string";
  }

  if (entry.status !== "ok" && entry.status !== "fail") {
    return 'status must be "ok" or "fail"';
  }

  // "error" may legitimately be null for successful runs.
  if (entry.error !== null && typeof entry.error !== "string") {
    return "error must be null or a string";
  }

  // Counts
  if (entry.counts === null || typeof entry.counts !== "object") {
    return "counts must be an object";
  }

  const requiredCounts = ["seen", "new", "routed", "unrouted"];

  for (const field of requiredCounts) {
    if (!Object.prototype.hasOwnProperty.call(entry.counts, field)) {
      return `missing required counts field: ${field}`;
    }

    if (!Number.isFinite(entry.counts[field])) {
      return `counts.${field} must be a number`;
    }
  }

  // Feeds
  if (entry.feeds === null || typeof entry.feeds !== "object") {
    return "feeds must be an object";
  }

  const requiredFeeds = ["granola", "meet", "dropzone"];

  for (const feedName of requiredFeeds) {
    if (
      !Object.prototype.hasOwnProperty.call(entry.feeds, feedName) ||
      entry.feeds[feedName] === null ||
      typeof entry.feeds[feedName] !== "object"
    ) {
      return `missing or invalid feed: ${feedName}`;
    }

    const feed = entry.feeds[feedName];

    if (!Object.prototype.hasOwnProperty.call(feed, "last_file")) {
      return `missing required field: feeds.${feedName}.last_file`;
    }

    if (!Object.prototype.hasOwnProperty.call(feed, "files_seen")) {
      return `missing required field: feeds.${feedName}.files_seen`;
    }

    if (typeof feed.last_file !== "string" || feed.last_file.length === 0) {
      return `feeds.${feedName}.last_file must be a non-empty string`;
    }

    if (!Number.isFinite(feed.files_seen)) {
      return `feeds.${feedName}.files_seen must be a number`;
    }
  }

  return null;
}

/**
 * Reads run-log.jsonl line by line.
 *
 * Every line becomes exactly one entry:
 * - valid JSON + valid structure -> type: "run"
 * - invalid JSON / missing fields / invalid fields -> type: "unknown"
 *
 * Record-level problems never stop processing the rest of the file.
 */
export async function readRunLog(filePath) {
  const entries = [];

  const stream = fs.createReadStream(filePath, {
    encoding: "utf8",
  });

  stream.on("error", (error) => {
    // This is a file/system error, not a bad JSONL record.
    // Let the caller handle cases such as a missing file or permission error.
    stream.destroy(error);
  });

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  try {
    for await (const rawLine of rl) {
      lineNumber += 1;

      const line = rawLine.trim();

      // Empty lines are treated as UNKNOWN rather than ignored.
      if (line.length === 0) {
        entries.push({
          type: "unknown",
          line: lineNumber,
          reason: "empty line",
        });

        continue;
      }

      let parsed;

      try {
        parsed = JSON.parse(line);
      } catch {
        entries.push({
          type: "unknown",
          line: lineNumber,
          reason: "invalid JSON",
          raw: line,
        });

        continue;
      }

      const validationError = validateRunEntry(parsed);

      if (validationError !== null) {
        entries.push({
          type: "unknown",
          line: lineNumber,
          reason: validationError,
          raw: line,
        });

        continue;
      }

      entries.push({
        type: "run",
        line: lineNumber,
        data: parsed,
      });
    }
  } finally {
    rl.close();
  }

  return entries;
}
