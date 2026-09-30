function formatDate(dateString) {
  if (!dateString) {
    return "unknown date";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "unknown date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function LastGoodBanner({ latestRun, latestGood }) {
  // Only show this banner when the latest run actually failed.
  if (!latestRun || latestRun.classification !== "FAILED") {
    return null;
  }

  const goodRun = latestGood?.run;

  return (
    <div className="last-good-banner" role="alert">
      <strong>No brief produced.</strong>{" "}
      {goodRun ? (
        <>
          Last good run: #{goodRun.run} on {formatDate(goodRun.started_at)}.
        </>
      ) : (
        "No previous good run is available."
      )}
    </div>
  );
}
