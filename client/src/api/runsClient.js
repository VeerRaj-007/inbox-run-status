const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function fetchRuns() {
  return fetchJson("/runs");
}

export async function fetchLatestGood() {
  return fetchJson("/latest-good");
}

export async function fetchRunsData() {
  const [runs, latestGood] = await Promise.all([
    fetchRuns(),
    fetchLatestGood(),
  ]);

  return {
    runs,
    latestGood,
  };
}
