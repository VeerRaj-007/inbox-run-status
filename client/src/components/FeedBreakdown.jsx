function formatFeedName(feedName) {
  return feedName.charAt(0).toUpperCase() + feedName.slice(1);
}

function formatStatus(feedResult) {
  if (!feedResult) {
    return "UNKNOWN";
  }

  if (feedResult.status === "stale") {
    return "STALE";
  }

  if (feedResult.status === "fresh") {
    return "FRESH";
  }

  if (feedResult.status === "not_evaluable") {
    return "NOT EVALUABLE";
  }

  return "UNKNOWN";
}

function getStatusClass(feedResult) {
  if (!feedResult) {
    return "feed-status feed-status-unknown";
  }

  if (feedResult.status === "stale") {
    return "feed-status feed-status-stale";
  }

  if (feedResult.status === "fresh") {
    return "feed-status feed-status-fresh";
  }

  if (feedResult.status === "not_evaluable") {
    return "feed-status feed-status-not-evaluable";
  }

  return "feed-status feed-status-unknown";
}

export default function FeedBreakdown({ run }) {
  if (!run) {
    return null;
  }

  if (run.type === "unknown") {
    return (
      <section className="feed-breakdown">
        <h2>Feed Breakdown</h2>
        <p>Feed data is unavailable for this unknown run.</p>
      </section>
    );
  }

  const feedResults = run.feed_results ?? [];

  if (feedResults.length === 0) {
    return (
      <section className="feed-breakdown">
        <h2>Feed Breakdown</h2>
        <p>Feed freshness was not evaluated for this run.</p>
      </section>
    );
  }

  return (
    <section className="feed-breakdown">
      <div className="feed-breakdown-header">
        <h2>Feed Breakdown</h2>
        <span>Run #{run.run}</span>
      </div>

      <div className="feed-breakdown-list">
        {feedResults.map((feed) => (
          <div className="feed-row" key={feed.feed}>
            <div className="feed-name">{formatFeedName(feed.feed)}</div>

            <div className="feed-last-file">
              <span className="feed-label">Last file</span>
              <span>{feed.last_file ?? "—"}</span>
            </div>

            <div className="feed-freshness">
              <span className="feed-label">Status</span>

              <span className={getStatusClass(feed)}>{formatStatus(feed)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
