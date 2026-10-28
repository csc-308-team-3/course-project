import { Link } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useHousehold } from '../context/HouseholdContext';

function CalendarPage() {
  const { household } = useHousehold();

  return (
    <main className="app-page household-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card household-card calendar-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions">
            <Link className="nav-button" to="/household">
              Household
            </Link>
            <button type="button" className="nav-button active-nav-button">
              Calendar
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
          <p className="eyebrow">HOUSEHOLD CHORE CALENDAR</p>
          <h1 className="board-title">{household.name}</h1>
          <p className="page-subtitle">
            See what is coming up and keep everyone on the same page.
          </p>
        </section>
      </section>
    </main>
  );
}

export default CalendarPage;