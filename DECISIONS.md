# Decisions and assumptions

## Status rules

Every run gets one label:

- **FAILED**: the log says `status: "fail"`. Shown with the error text and the counts.
- **PARTIAL**: the log says `status: "ok"`, but at least one feed is stale (see feed rule).
- **OK**: status is ok and no feed is stale.
- **UNKNOWN**: the log line can't be parsed, or has missing fields. Never treated as OK.

## Product decision: what a failed day shows

A failed run shows "No brief produced. Last good run: #X on <date>".
Yesterday's artifact is never shown as if it were today's.
Why: the original problem is that a failure looks fine. Showing old data
silently is the exact bug, so old data always carries a "stale" label.

## Feed staleness rule

A feed is stale when its newest file (`last_file`) is more than N days
older than the run date.

- granola and meet: N = 3 (the `feed_freshness_threshold_days` in config.json)
- dropzone: N = 12 (picked from the healthy-run data, see below)
  Why per-feed: dropzone is manual file drops, so gaps are normal there.
  With one global threshold of 3, dropzone would flag almost every day,
  and a screen that is always yellow gets ignored.
  Cost: a truly dead dropzone feed stays hidden for longer.
  How I picked the number: 12 days (run #114, run date 2026-07-20, last_file 2026-07-08)

## Why "partial" exists

The log only has ok/fail. Runs 121-129 say ok while granola saw zero
files and its newest file stayed 9+ days old. A job can say ok while a
source is dead, so ok/fail alone isn't enough.

## Assumptions (nobody answered questions, so I assumed)

- Missing run numbers are weekends with no scheduled run, not lost runs.
- `counts` means: seen = items found, new = not seen before, routed =
  assigned to a project, unrouted = no project matched.
- The error is a single line, not a full stack trace, so I split it into
  error type and message. A real trace would also give: where it failed,
  and what succeeded before it.
- Error text is untrusted data and is rendered as plain text.
- The mission is read-only, so no write path is built.

## What I cut

- Writing/editing the ledger (not needed for this mission)
- Linking runs to individual signals
- Auth, deployment, cloud services (ruled out by the brief)
