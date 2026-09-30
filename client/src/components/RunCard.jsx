import StatusBadge from "./StatusBadge.jsx";

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(value) {
  return Number.isFinite(value) ? value : "—";
}

export default function RunCard({ run }) {
  const isUnknown = run.type === "unknown";

  if (isUnknown) {
    return (
      <tr className="run-row run-row-unknown">
        <td colSpan={7}>
          <div className="run-unknown">
            <StatusBadge status="UNKNOWN" />
            <span>
              Line {run.line}: {run.reason}
            </span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="run-row">
      <td className="run-date">{formatDate(run.started_at)}</td>

      <td className="run-number">#{run.run}</td>

      <td>
        <StatusBadge status={run.classification} />
      </td>

      <td>{formatCount(run.counts?.seen)}</td>
      <td>{formatCount(run.counts?.new)}</td>
      <td>{formatCount(run.counts?.routed)}</td>
      <td>{formatCount(run.counts?.unrouted)}</td>
    </tr>
  );
}
