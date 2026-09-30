import express from "express";
import runsRouter from "./routes/runs.js";

const app = express();
const PORT = 4000;

app.use(express.json());

app.use("/api", runsRouter);

app.use((error, req, res, next) => {
  console.error("Request failed:", error);

  if (error?.code === "ENOENT") {
    return res.status(500).json({
      error: "Run log unavailable",
      message: "The run-log.jsonl file was not found.",
    });
  }

  if (error?.code === "EACCES" || error?.code === "EPERM") {
    return res.status(500).json({
      error: "Run log unavailable",
      message: "The run-log.jsonl file exists but cannot be read.",
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: "The server could not read the run log.",
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
