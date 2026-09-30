import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname = E:/project/inbox-run-status/server
// Project root = E:/project/inbox-run-status
export const PROJECT_ROOT = path.resolve(__dirname, "..");

export const DATA_DIR = path.join(PROJECT_ROOT, "data");

export const RUN_LOG_FILE = path.join(DATA_DIR, "run-log.jsonl");

export const CONFIG_FILE = path.join(DATA_DIR, "config.json");
