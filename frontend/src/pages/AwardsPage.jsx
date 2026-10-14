import { Link } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useHousehold } from '../context/HouseholdContext';

const leaderboard = [
  { rank: 1, name: 'Chris Zielke', initials: 'CZ', points: '1,345', medal: '🥇' },
  { rank: 2, name: 'Gary Chiu', initials: 'GC', points: '1,200', medal: '🥈' },
  { rank: 3, name: 'Omar Mohamed', initials: 'OM', points: '100', medal: '🥉' },
];

function AwardsPage() {
  const { hasHousehold } = useHousehold();

  return (
    <main className="app-page awards-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card awards-page-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions">
            <Link className="nav-button" to="/household">
              Household
            </Link>
            <Link className="nav-button active-nav-button" to="/awards">
              Awards
            </Link>
            <Link className="nav-button" to="/profile">
              Profile
            </Link>
            <LogoutButton />
          </nav>
        </header>

        {hasHousehold ? (
          <section className="awards-content">
            <div className="awards-intro">
              <p className="eyebrow">HOUSEHOLD AWARDS</p>
              <h1 className="page-title">Do your chores, mate!</h1>
              <p className="page-subtitle">
                Every completed chore earns you points to your household leaderboard.
              </p>
            </div>

            <div className="points-summary">
              <span className="points-icon">⭐</span>
              <div>
                <p>Your score</p>
                <strong>1,200 points</strong>
              </div>
              <span className="points-message">145 points from first place</span>
            </div>

            <section className="leaderboard-card">
              <div className="leaderboard-heading">
                <div>
                  <p className="eyebrow">GARY CHIU&apos;S HOUSE</p>
                  <h2>House leaderboard</h2>
                </div>
                <span>This month</span>
              </div>

              <div className="leaderboard-labels">
                <span>Rank</span>
                <span>Roommate</span>
                <span>Points</span>
              </div>

              {leaderboard.map((roommate) => (
                <article className="leaderboard-row" key={roommate.name}>
                  <span className="leaderboard-rank">
                    {roommate.medal} {roommate.rank}
                  </span>

                  <div className="leaderboard-person">
                    <span className="leaderboard-avatar">{roommate.initials}</span>
                    <strong>{roommate.name}</strong>
                  </div>

                  <strong className="leaderboard-points">
                    {roommate.points}
                  </strong>
                </article>
              ))}
            </section>
          </section>
        ) : (
          <section className="awards-empty-state">
            <div className="awards-empty-icon">🏆</div>
            <p className="eyebrow">HOUSEHOLD AWARDS</p>
            <h1 className="page-title">Your leaderboard awaits</h1>
            <p className="page-subtitle">
              Join a household to earn points, celebrate chores, and climb the
              leaderboard with your roommates.
            </p>

            <Link className="primary-button awards-join-button" to="/no-household">
              Join a household
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}

export default AwardsPage;
