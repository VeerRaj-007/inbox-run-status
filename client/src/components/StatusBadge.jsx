const STATUS_CONFIG = {
  OK: {
    label: "OK",
    className: "status-badge status-ok",
  },
  PARTIAL: {
    label: "PARTIAL",
    className: "status-badge status-partial",
  },
  FAILED: {
    label: "FAILED",
    className: "status-badge status-failed",
  },
  UNKNOWN: {
    label: "UNKNOWN",
    className: "status-badge status-unknown",
  },
};

export default function StatusBadge({ status }) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  const config = STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.UNKNOWN;

  return <span className={config.className}>{config.label}</span>;
}
