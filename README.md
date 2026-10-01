# Inbox Run Status

A read-only monitoring app for classifying daily runs and showing feed freshness.

The backend reads existing `run-log.jsonl` and `config.json` files, classifies each run as `OK`, `PARTIAL`, `FAILED`, or `UNKNOWN`, and exposes the results through a small Express API.

The frontend is a React + Vite dashboard that displays run history, counts, feed freshness, and the failed-day banner.

## Stack

- Node.js
- Express
- React
- Vite
- Vitest
- JSONL + JSON files
- No database

## Project structure

```text
inbox-run-status/
├── data/
│   ├── run-log.jsonl
│   └── config.json
│
├── server/
│   ├── dataPaths.js
│   ├── src/
│   │   ├── index.js
│   │   ├── classify/
│   │   ├── routes/
│   │   └── services/
│   └── scripts/
│       └── maxStaleness.js
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   └── vite.config.js
│
└── README.md
```

## Install

### Server

```bash
cd server
npm install
```

### Client

In a separate terminal:

```bash
cd client
npm install
```

## Run

### Start the server

From the `server` directory:

```bash
node src/index.js
```

The API listens on:

```text
http://localhost:4000
```

Useful endpoints:

```text
GET /api/runs
GET /api/latest-good
```

### Start the client

From the `client` directory:

```bash
npm run dev
```

Vite normally uses port `5173`. If that port is already in use, Vite will select another available port such as `5174`.

The frontend uses the Vite development proxy to forward `/api` requests to the Express server.

## Run tests

From the repository root:

```bash
npx vitest run
```

Current tests cover:

- Failed runs #131 and #144
- Partial runs caused by stale Granola
- Garbage input becoming `UNKNOWN`
- `files_seen: 0` not causing staleness when `last_file` is fresh
- Failed runs remaining `FAILED` even when feed data is stale
- Strict `started_at` validation
- Invalid dates, missing timezone marker, and timezone offsets becoming `UNKNOWN`

## Status rules

Each run receives exactly one classification:

### FAILED

The source log has:

```text
status: "fail"
```

A failed run is classified as `FAILED` before feed data is evaluated.

### PARTIAL

The source log has:

```text
status: "ok"
```

but at least one evaluable feed is stale.

### OK

The source log has:

```text
status: "ok"
```

and no evaluable feed is stale.

### UNKNOWN

A log line becomes `UNKNOWN` when it cannot be parsed or does not satisfy the required run shape.

`UNKNOWN` is never treated as `OK`.

## Feed freshness

Feed staleness is based only on:

```text
run date - last_file date
```

`files_seen` is not used to determine freshness.

A feed is stale when:

```text
age in days > configured threshold
```

For example, with a threshold of `3`:

```text
age 3 → fresh
age 4 → stale
```

An unconfigured threshold makes the feed:

```text
NOT EVALUABLE
```

It is neither fresh nor stale.

## Failed-day behavior

A failed run does not display an older artifact as if it were today's result.

Instead, the dashboard shows:

```text
No brief produced. Last good run: #X on <date>.
```

The `/api/latest-good` endpoint returns the most recent `OK` or `PARTIAL` run for this banner.

## Assumptions

The implementation follows these assumptions from `decision.md`:

- Missing run numbers are weekends or other unscheduled days, not automatically lost runs.
- `counts` means `seen`, `new`, `routed`, and `unrouted`.
- The error field contains a single line of error text rather than a full stack trace.
- Error text is untrusted data and is rendered as plain text.
- The application is read-only.
- There is no write path for editing the ledger.
- Runs are not linked to individual signals.
- Authentication, deployment, and cloud services are out of scope.

## Time spent

Time spent: `2 hours 40 minutes`
