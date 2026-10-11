import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChores } from '../context/ChoreContext';

function HouseholdPage() {
  const [selectedWeek, setSelectedWeek] = useState(
   'Week of October 12 – October 18', );

  const { chores } = useChores();

  const roommates = ['Gary Chiu', 'Omar Mohamed', 'Chris Zielke'];

  function statusClass(status) {
    if (status === 'todo') return 'todo-task';
    if (status === 'due') return 'due-task';
    return 'complete-task';
  }

  function statusMessage(chore) {
    if (chore.status === 'complete') {
      return `Completed ${chore.dueDate}`;
    }

    return `Due ${chore.dueDate}`;
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
            <Link className="nav-button" to="/profile">
              Profile
            </Link>
            <Link className="text-button" to="/">
              Log out
            </Link>
          </nav>
        </header>

        <section className="board-intro">
          <p className="eyebrow">HOUSEHOLD CHORE BOARD</p>
          <h1 className="board-title">Gary Chiu&apos;s House</h1>

          <div className="board-details">
            <div className="week-picker">
              <select
                className="week-selector"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                aria-label="Choose a week"
              >
                <option>Week of September 28 – October 4</option>
                <option>Week of October 5 – October 11</option>
                <option>Week of October 12 – October 18</option>
                <option>Week of October 19 – October 25</option>
                <option>Week of October 26 – November 1</option>
              </select>

              <span className="dropdown-arrow" aria-hidden="true">
                ▼
              </span>
            </div>

            <p className="group-code">
              Group code: <strong>A1B2C3</strong>
            </p>
          </div>
        </section>

        <section className="board-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THIS WEEK'S ANNOUNCEMENT:</p>
              <h2 className="announcement-message">
                Please Chris Zielke fix the Wi-Fi!!!! We need it for the presentation!
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

            {roommates.map((roommate) => (
              <div className="board-row" key={roommate}>
                <div className="roommate-name">{roommate}</div>

                {['todo', 'due', 'complete'].map((status) => {
                  const chore = chores.find(
                    (currentChore) =>
                      currentChore.roommate === roommate &&
                      currentChore.status === status,
                  );

                  return (
                    <div key={status}>
                      {chore && (
                        <Link
                          className={`task-card task-card-link ${statusClass(
                            chore.status,
                          )}`}
                          to={`/chores/${chore.id}`}
                        >
                          <span>{chore.icon}</span>
                          <div>
                            <h3>{chore.title}</h3>
                            <p>{statusMessage(chore)}</p>
                          </div>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default HouseholdPage;