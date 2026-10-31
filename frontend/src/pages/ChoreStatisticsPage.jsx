import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useHousehold } from '../context/HouseholdContext';
import { useChoreHistoryResource } from '../hooks/useChoreHistoryResource';
import {
  getCurrentUtcMonth,
  isValidMonth,
  statisticsPath,
} from '../services/choreHistory';
import '../styles/chore-history.css';

function MonthlySummary({ household }) {
  const [month, setMonth] = useState(getCurrentUtcMonth);
  const validMonth = isValidMonth(month);

  const path = validMonth ? statisticsPath(household.id, month) : null;

  const { data, error, loading, retry } = useChoreHistoryResource(path);

  const total = data
    ? data.members.reduce((sum, member) => sum + member.completedCount, 0)
    : 0;

  return (
    <main className="app-page">
      <section className="app-card history-card">
        <Navbar />

        <p className="eyebrow">HOUSEHOLD ACTIVITY</p>
        <h1 className="page-title">Monthly chore summary</h1>
        <p className="page-subtitle">{household.name}</p>

        <div className="history-toolbar">
          <label htmlFor="statistics-month">
            Month
            <input
              id="statistics-month"
              type="month"
              min="0001-01"
              max="9998-12"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
        </div>

        <p>
          Counts use completion dates in UTC and include current household
          members.
        </p>

        {!validMonth && (
          <p className="form-error" role="alert">
            Choose a valid month between 0001-01 and 9998-12.
          </p>
        )}

        {loading && <p role="status">Loading monthly summary...</p>}

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
            <p className="history-total" role="status">
              {total} completed {total === 1 ? 'chore' : 'chores'} in{' '}
              {data.month}
            </p>

            {data.members.length === 0 ? (
              <p>No current household members to display.</p>
            ) : (
              <>
                {total === 0 && <p>No recorded completions for this month.</p>}

                <div className="history-table-scroll">
                  <table className="history-table">
                    <caption>Monthly completions by household member</caption>
                    <thead>
                      <tr>
                        <th scope="col">Roommate</th>
                        <th scope="col">Chores completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.members.map((member) => (
                        <tr key={member.memberId}>
                          <th scope="row">{member.memberName}</th>
                          <td>{member.completedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <p>
          <Link to="/calendar">
            Open the calendar and choose a chore to view its history.
          </Link>
        </p>
      </section>
    </main>
  );
}

function ChoreStatisticsPage() {
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

  return <MonthlySummary key={household.id} household={household} />;
}

export default ChoreStatisticsPage;
