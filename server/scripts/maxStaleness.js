import fs from "node:fs";
import readline from "node:readline";

import { RUN_LOG_FILE } from "../dataPaths.js";

const feeds = ["granola", "meet", "dropzone"];

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

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

const maxLag = Object.fromEntries(
  feeds.map((feed) => [
    feed,
    {
      days: null,
      run: null,
      run_date: null,
      last_file: null,
    },
  ]),
);

const stream = fs.createReadStream(RUN_LOG_FILE, {
  encoding: "utf8",
});

stream.on("error", (error) => {
  console.error(`Could not read run log: ${RUN_LOG_FILE}`);
  console.error(error.message);
  process.exitCode = 1;
});

const rl = readline.createInterface({
  input: stream,
  crlfDelay: Infinity,
});

for await (const rawLine of rl) {
  const line = rawLine.trim();

  if (!line) {
    continue;
  }

  let entry;

  try {
    entry = JSON.parse(line);
  } catch {
    // Ignore malformed lines for this analysis report.
    continue;
  }

  // Only raw status=ok runs are considered.
  if (entry?.status !== "ok") {
    continue;
  }

  if (typeof entry.started_at !== "string") {
    continue;
  }

  const runDate = entry.started_at.slice(0, 10);
  const runDateValue = parseDateOnly(runDate);

  if (!runDateValue) {
    continue;
  }

  for (const feedName of feeds) {
    const feed = entry.feeds?.[feedName];

    if (!feed || typeof feed.last_file !== "string") {
      continue;
    }

    const lastFileDate = parseDateOnly(feed.last_file);

    if (!lastFileDate) {
      continue;
    }

    const lagDays = Math.max(
      0,
      Math.floor(
        (runDateValue.getTime() - lastFileDate.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    if (maxLag[feedName].days === null || lagDays > maxLag[feedName].days) {
      maxLag[feedName] = {
        days: lagDays,
        run: entry.run,
        run_date: runDate,
        last_file: feed.last_file,
      };
    }
  }
}

console.log("Maximum staleness lag across status=ok runs");
console.log("------------------------------------------------");

for (const feedName of feeds) {
  const result = maxLag[feedName];

  if (result.days === null) {
    console.log(`${feedName}: no valid data`);
    continue;
  }

  console.log(
    `${feedName}: ${result.days} days ` +
      `(run #${result.run}, run date ${result.run_date}, ` +
      `last_file ${result.last_file})`,
  );
}
