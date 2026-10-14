import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useHousehold } from '../context/HouseholdContext';

const weekOptions = [
  { value: '2026-09-28', label: 'Week of September 28 – October 4' },
  { value: '2026-10-05', label: 'Week of October 5 – October 11' },
  { value: '2026-10-12', label: 'Week of October 12 – October 18' },
  { value: '2026-10-19', label: 'Week of October 19 – October 25' },
  { value: '2026-10-26', label: 'Week of October 26 – November 1' },
];

function HouseholdPage() {
  const [selectedWeek, setSelectedWeek] = useState('2026-10-12');
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState('');
  const [boardLoading, setBoardLoading] = useState(true);
  const { household } = useHousehold();

  useEffect(() => {
    async function loadBoard() {
      setBoardLoading(true);
      setBoardError('');

      try {
        const response = await fetch(
          `/api/households/${household.id}/chore-board?weekStart=${selectedWeek}`,
          { credentials: 'include' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load the chore board.');
        }

        setBoard(data);
      } catch (error) {
        setBoard(null);
        setBoardError(error.message);
      } finally {
        setBoardLoading(false);
      }
    }

    loadBoard();
  }, [household.id, selectedWeek]);

  function statusClass(status) {
    if (status === 'todo') return 'todo-task';
    if (status === 'due') return 'due-task';
    return 'complete-task';
  }

  function statusMessage(chore, status) {
    return status === 'complete'
      ? `Completed ${chore.dueDate}`
      : `Due ${chore.dueDate}`;
  }

  return (
    <main className="app-page household-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card household-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions">
            <button type="button" className="nav-button active-nav-button">
              Household
            </button>
            <Link className="nav-button" to="/awards">
              Awards
            </Link>
            <Link className="nav-button" to="/profile">
              Profile
            </Link>
            <LogoutButton />
          </nav>
        </header>

        <section className="board-intro">
          <p className="eyebrow">HOUSEHOLD CHORE BOARD</p>
          <h1 className="board-title">{household.name}</h1>

          <div className="board-details">
            <div className="week-picker">
              <select
                className="week-selector"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                aria-label="Choose a week"
              >
                {weekOptions.map((week) => (
                  <option key={week.value} value={week.value}>
                    {week.label}
                  </option>
                ))}
              </select>

              <span className="dropdown-arrow" aria-hidden="true">
                ▼
              </span>
            </div>

            <p className="group-code">
              Group code: <strong>{household.inviteCode}</strong>
            </p>
          </div>
        </section>

        <section className="board-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THIS WEEK'S ANNOUNCEMENT:</p>
              <h2 className="announcement-message">
                Please Chris Zielke fix the Wi-Fi!!!! We need it for the
                presentation!
              </h2>
            </div>

            <button type="button" className="small-primary-button">
              + Add chore
            </button>
          </div>

          <div className="chore-board">
            <div className="board-row board-labels">
              <p>Roommates</p>
              <p className="todo-label">To Do</p>
              <p className="due-label">Due Today</p>
              <p className="complete-label">Complete</p>
            </div>

            {boardLoading && (
              <div className="board-row">
                <div className="roommate-name">Loading chores...</div>
              </div>
            )}

            {boardError && (
              <div className="board-row">
                <div className="roommate-name">{boardError}</div>
              </div>
            )}

            {!boardLoading && !boardError && board.roommates.length === 0 && (
              <div className="board-row">
                <div className="roommate-name">No chores for this week.</div>
              </div>
            )}

            {board?.roommates.map((roommate) => (
              <div className="board-row" key={roommate.id}>
                <div className="roommate-name">{roommate.name}</div>

                {['todo', 'due', 'complete'].map((status) => (
                  <div key={status}>
                    {roommate.chores[status].map((chore) => (
                      <div
                        className={`task-card ${statusClass(status)}`}
                        key={chore.id}
                      >
                        <div>
                          <h3>{chore.title}</h3>
                          <p>{statusMessage(chore, status)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default HouseholdPage;
