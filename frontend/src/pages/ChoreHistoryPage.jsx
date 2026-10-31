import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useHousehold } from '../context/HouseholdContext';
import { useChoreHistoryResource } from '../hooks/useChoreHistoryResource';
import { historyPath } from '../services/choreHistory';
import '../styles/chore-history.css';

function formatCompletion(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown completion time';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function HistoryContents({ householdId, choreId }) {
  const [offset, setOffset] = useState(0);
  const { data, error, loading, retry } = useChoreHistoryResource(
    historyPath(householdId, choreId, offset),
  );

  return (
    <main className="app-page">
      <section className="app-card history-card">
        <Navbar />

        <p className="eyebrow">CHORE ACTIVITY</p>
        <h1 className="page-title">
          {data ? `${data.chore.title}: completion history` : 'Chore history'}
        </h1>

        <p>Recorded completions, newest first. Times are shown in UTC.</p>

        {loading && <p role="status">Loading chore history...</p>}

        {error && (
          <div role="alert">
            <p className="form-error">{error}</p>
            <button type="button" className="secondary-button" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {data.history.length === 0 ? (
              <p role="status">
                {offset === 0
                  ? 'No recorded completions for this chore.'
                  : 'No more recorded completions.'}
              </p>
            ) : (
              <div className="history-table-scroll">
                <table className="history-table">
                  <caption>Recorded chore completions</caption>
                  <thead>
                    <tr>
                      <th scope="col">Roommate</th>
                      <th scope="col">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((entry) => (
                      <tr key={entry.instanceId}>
                        <th scope="row">{entry.memberName}</th>
                        <td>
                          <time dateTime={entry.completedAt}>
                            {formatCompletion(entry.completedAt)}
                          </time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="history-pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((value) => Math.max(0, value - 50))}
          >
            Previous page
          </button>

          <span>Page {offset / 50 + 1}</span>

          <button
            type="button"
            className="secondary-button"
            disabled={
              loading ||
              !data ||
              data.history.length < 50 ||
              offset > 2147483597
            }
            onClick={() => setOffset((value) => value + 50)}
          >
            Next page
          </button>
        </div>

        <p>
          Older completed records without completion timestamps are not
          included.
        </p>

        <div className="history-links">
          <Link to="/calendar">Back to calendar</Link>
          <Link to="/household/statistics">Monthly summary</Link>
        </div>
      </section>
    </main>
  );
}

function ChoreHistoryPage() {
  const { choreId } = useParams();
  const { household, loading } = useHousehold();

  if (loading) {
    return (
      <main className="app-page">
        <p role="status">Loading household...</p>
      </main>
    );
  }

  if (!household) {
    return <Navigate to="/no-household" replace />;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      choreId,
    )
  ) {
    return (
      <main className="app-page">
        <section className="app-card history-card">
          <Navbar />
          <h1 className="page-title">Invalid chore link</h1>
          <p role="alert">Choose a chore from the calendar.</p>
          <Link to="/calendar">Back to calendar</Link>
        </section>
      </main>
    );
  }

  return (
    <HistoryContents
      key={`${household.id}:${choreId}`}
      householdId={household.id}
      choreId={choreId}
    />
  );
}

export default ChoreHistoryPage;
