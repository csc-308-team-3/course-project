import { Link, useNavigate, useParams } from 'react-router-dom';
import { useChores } from '../context/ChoreContext';

function ChoreDetailsPage() {
  const { choreId } = useParams();
  const navigate = useNavigate();
  const { chores, updateChoreStatus } = useChores();

  const chore = chores.find((currentChore) => currentChore.id === choreId);

  if (!chore) {
    return (
        <main className="app-page">
        <section className="app-card chore-details-card not-found-card">
            <p className="eyebrow">CHORE DETAILS</p>
            <h1 className="page-title">Chore not found</h1>
            <p className="page-subtitle">
            This chore may have been deleted or the link may be incorrect.
            </p>

            <Link className="back-button" to="/household">
            <span aria-hidden="true">←</span>
            Back to household
            </Link>
        </section>
        </main>
    );
  }

  function handleStatusChange(event) {
    updateChoreStatus(chore.id, event.target.value);
    navigate('/household');
  }

  return (
    <main className="app-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card chore-details-card">
        <Link className="back-button" to="/household">
            <span aria-hidden="true">←</span>
            Back to household
        </Link>

        <p className="eyebrow">CHORE DETAILS</p>
        <h1 className="page-title">{chore.title}</h1>
        <p className="page-subtitle">Assigned to {chore.roommate}</p>

        <div className="chore-meta">
          <div className="detail-row">
            <span>Category</span>
            <strong>{chore.category}</strong>
          </div>

          <div className="detail-row">
            <span>Due date</span>
            <strong>{chore.dueDate}</strong>
          </div>
        </div>

        <section className="instructions-card">
          <p className="eyebrow">INSTRUCTIONS</p>
          <p>{chore.instructions}</p>
        </section>

        <div className="status-field">
        <label htmlFor="status">Status</label>

        <div className="week-picker">
            <select
            id="status"
            className="week-selector status-select"
            value={chore.status}
            onChange={handleStatusChange}
            >
            <option value="todo">To Do</option>
            <option value="due">Due Today</option>
            <option value="complete">Complete</option>
            </select>

            <span className="dropdown-arrow" aria-hidden="true">
            ▼
            </span>
        </div>
        </div>
      </section>
    </main>
  );
}

export default ChoreDetailsPage;