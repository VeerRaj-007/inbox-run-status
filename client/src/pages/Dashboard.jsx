import { useEffect, useState } from "react";

import { fetchRunsData } from "../api/runsClient.js";

import LastGoodBanner from "../components/LastGoodBanner.jsx";
import RunList from "../components/RunList.jsx";
import FeedBreakdown from "../components/FeedBreakdown.jsx";
import ErrorText from "../components/ErrorText.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchRunsData();

        if (cancelled) {
          return;
        }

        setData(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Loading state
   */
  if (loading) {
    return (
      <main className="dashboard">
        <div className="dashboard-state">
          <h1>Daily Brief Monitor</h1>
          <p>Loading runs...</p>
        </div>
      </main>
    );
  }

  /*
   * Error state
   */
  if (error) {
    return (
      <main className="dashboard">
        <div className="dashboard-state dashboard-state-error" role="alert">
          <h1>Daily Brief Monitor</h1>
          <h2>Unable to load runs</h2>
          <ErrorText error={error} />
        </div>
      </main>
    );
  }

  const runs = data?.runs?.runs ?? [];
  const latestGood = data?.latestGood ?? { run: null };

  /*
   * Empty state
   */
  if (runs.length === 0) {
    return (
      <main className="dashboard">
        <div className="dashboard-state">
          <h1>Daily Brief Monitor</h1>
          <h2>No runs available</h2>
          <p>There are no classified run records to display.</p>
        </div>
      </main>
    );
  }

  /*
   * The API returns the log in file order. For the dashboard,
   * the most recent run should be the primary run.
   *
   * We do not classify anything here; classification already
   * happened on the server.
   */
  const latestRun = [...runs]
    .filter((run) => run.type === "run")
    .sort((a, b) => {
      if (a.started_at && b.started_at) {
        return (
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
      }

      return (b.run ?? 0) - (a.run ?? 0);
    })[0];

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Daily Brief Monitor</h1>
          <p>Read-only run status and feed health.</p>
        </div>
      </header>

      {latestRun && (
        <section className="latest-run">
          <div className="latest-run-heading">
            <div>
              <span className="section-label">Latest run</span>

              <h2>Run #{latestRun.run}</h2>
            </div>

            <StatusBadge status={latestRun.classification} />
          </div>

          <div className="latest-run-meta">
            <span>
              {latestRun.started_at
                ? new Date(latestRun.started_at).toLocaleString()
                : "Unknown start time"}
            </span>
          </div>

          {latestRun.classification === "FAILED" && (
            <ErrorText error={latestRun.error} />
          )}
        </section>
      )}

      <LastGoodBanner latestRun={latestRun} latestGood={latestGood} />

      {latestRun && (
        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Selected run</h2>
            <span>Click a run below to inspect its feeds.</span>
          </div>

          <FeedBreakdown run={selectedRun ?? latestRun} />
        </section>
      )}

      <section className="dashboard-section">
        <RunList
          runs={runs}
          onSelectRun={setSelectedRun}
          selectedRun={selectedRun}
        />
      </section>
    </main>
  );
}
