const KNOWN_STATUSES = new Set(["ok", "fail"]);

const REQUIRED_FIELDS = [
  "run",
  "started_at",
  "status",
  "error",
  "counts",
  "feeds",
];

function isValidStartedAt(value) {
  if (typeof value !== "string") {
    return false;
  }

  // Exact timestamp contract used by the run log:
  // YYYY-MM-DDTHH:mm:ssZ
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(
    value,
  );

  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute, second] = match;

  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  const secondNumber = Number(second);

  const date = new Date(
    Date.UTC(
      yearNumber,
      monthNumber - 1,
      dayNumber,
      hourNumber,
      minuteNumber,
      secondNumber,
    ),
  );

  /*
   * Date.UTC normalizes invalid dates.
   * Compare all fields back to the original values
   * so values like 2026-02-31 are rejected.
   */
  return (
    date.getUTCFullYear() === yearNumber &&
    date.getUTCMonth() === monthNumber - 1 &&
    date.getUTCDate() === dayNumber &&
    date.getUTCHours() === hourNumber &&
    date.getUTCMinutes() === minuteNumber &&
    date.getUTCSeconds() === secondNumber
  );
}

export function parseRun(parsed) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      type: "unknown",
      reason: "entry must be an object",
    };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
      return {
        type: "unknown",
        reason: `missing required field: ${field}`,
      };
    }
  }

  if (!KNOWN_STATUSES.has(parsed.status)) {
    return {
      type: "unknown",
      reason: `unknown status: ${String(parsed.status)}`,
    };
  }

  if (!isValidStartedAt(parsed.started_at)) {
    return {
      type: "unknown",
      reason: "started_at must be a valid UTC timestamp",
    };
  }

  return {
    type: "run",
    data: parsed,
  };
}
