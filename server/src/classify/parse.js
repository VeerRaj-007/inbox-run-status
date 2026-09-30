const KNOWN_STATUSES = new Set(["ok", "fail"]);

const REQUIRED_FIELDS = [
  "run",
  "started_at",
  "status",
  "error",
  "counts",
  "feeds",
];

/**
 * Validate one already-parsed run-log entry.
 *
 * Returns:
 *   { type: "run", data }
 * or
 *   { type: "unknown", reason }
 */
export function parseRun(parsed) {
  // A parsed JSON value can technically be null, an array,
  // a string, a number, etc. We only accept objects.
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      type: "unknown",
      reason: "entry must be an object",
    };
  }

  // Check that every required top-level field exists.
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
      return {
        type: "unknown",
        reason: `missing required field: ${field}`,
      };
    }
  }

  // Only these two status values are recognized by the application.
  if (!KNOWN_STATUSES.has(parsed.status)) {
    return {
      type: "unknown",
      reason: `unknown status: ${String(parsed.status)}`,
    };
  }

  // started_at must be a string containing a valid date.
  if (
    typeof parsed.started_at !== "string" ||
    Number.isNaN(Date.parse(parsed.started_at))
  ) {
    return {
      type: "unknown",
      reason: "started_at must be a valid date",
    };
  }

  return {
    type: "run",
    data: parsed,
  };
}
