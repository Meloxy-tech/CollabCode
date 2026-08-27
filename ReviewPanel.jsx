export default function ReviewPanel({ review, loading }) {
  return (
    <div className="panel review-panel">
      <h3 className="panel-title">Code Check</h3>

      {loading && <p className="muted">Checking current code...</p>}

      {!loading && !review && (
        <p className="muted">Run "Code Check" to scan the room's code for issues.</p>
      )}

      {!loading && review && (
        <>
          <p className="review-summary">{review.summary}</p>

          {review.issues?.length > 0 && (
            <>
              <h4>Issues</h4>
              <ul className="issue-list">
                {review.issues.map((issue, i) => (
                  <li key={i} className={`issue issue-${issue.severity}`}>
                    {issue.line ? <span className="issue-line">L{issue.line}</span> : null}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </>
          )}

          {review.suggestions?.length > 0 && (
            <>
              <h4>Suggestions</h4>
              <ul className="suggestion-list">
                {review.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
