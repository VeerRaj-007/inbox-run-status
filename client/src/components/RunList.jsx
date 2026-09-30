import RunCard from "./RunCard.jsx";

export default function RunList({ runs = [] }) {
  if (runs.length === 0) {
    return (
      <section className="run-list">
        <h2>Runs</h2>
        <p className="run-list-empty">No runs available.</p>
      </section>
    );
  }

  return (
    <section className="run-list">
      <div className="run-list-header">
        <h2>Runs</h2>
        <span className="run-list-count">{runs.length} runs</span>
      </div>

      <div className="run-table-wrapper">
        <table className="run-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Run #</th>
              <th scope="col">Status</th>
              <th scope="col">Seen</th>
              <th scope="col">New</th>
              <th scope="col">Routed</th>
              <th scope="col">Unrouted</th>
            </tr>
          </thead>

          <tbody>
            {runs.map((run, index) => (
              <RunCard
                key={
                  run.type === "run"
                    ? `run-${run.run}`
                    : `unknown-${run.line ?? index}`
                }
                run={run}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
