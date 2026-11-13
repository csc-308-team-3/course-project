import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../services/leaderboard';

function initials(name) {
  return name.split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function medal(rank) {
  return { 1: '🥇', 2: '🥈', 3: '🥉' }[rank] ?? '';
}

function points(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function AwardsPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState('');
  const householdId = user?.householdId;

  useEffect(() => {
    if (!householdId) {
      setLeaderboard(null);
      return;
    }

    async function loadLeaderboard() {
      try {
        setError('');
        setLeaderboard(await getLeaderboard(householdId));
      } catch (loadError) {
        setLeaderboard(null);
        setError(loadError.message);
      }
    }

    loadLeaderboard();
  }, [householdId]);

  const currentMember = leaderboard?.members.find((member) => member.id === user?.id);
  const leadingPoints = leaderboard?.members[0]?.points ?? 0;
  const pointsBehind = Math.max(leadingPoints - (currentMember?.points ?? 0), 0);

  return (
    <main className="app-page awards-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card awards-page-card">
        <header className="household-nav">
          <div className="household-brand"><div className="brand-mark">⌂</div><strong>ChoreMate</strong></div>
          <nav className="nav-actions">
            <Link className="nav-button" to="/household">Household</Link>
            <Link className="nav-button active-nav-button" to="/awards">Awards</Link>
            <Link className="nav-button" to="/profile">Profile</Link>
            <LogoutButton />
          </nav>
        </header>

        {householdId ? (
          <section className="awards-content">
            <div className="awards-intro">
              <p className="eyebrow">HOUSEHOLD AWARDS</p>
              <h1 className="page-title">Do your chores, mate!</h1>
              <p className="page-subtitle">Every completed chore earns you points to your household leaderboard.</p>
            </div>

            {error && <p className="form-error">{error}</p>}
            {!error && !leaderboard && <p>Loading leaderboard…</p>}

            {leaderboard && (
              <>
                <div className="points-summary">
                  <span className="points-icon">⭐</span>
                  <div><p>Your score</p><strong>{points(currentMember?.points ?? 0)} points</strong></div>
                  <span className="points-message">
                    {pointsBehind === 0 ? 'You are in first place!' : `${points(pointsBehind)} points from first place`}
                  </span>
                </div>

                <section className="leaderboard-card">
                  <div className="leaderboard-heading">
                    <div><p className="eyebrow">{leaderboard.householdName}</p><h2>House leaderboard</h2></div>
                    <span>All time</span>
                  </div>
                  <div className="leaderboard-labels"><span>Rank</span><span>Roommate</span><span>Points</span></div>

                  {leaderboard.members.map((roommate) => (
                    <article className="leaderboard-row" key={roommate.id}>
                      <span className="leaderboard-rank">{medal(roommate.rank)} {roommate.rank}</span>
                      <div className="leaderboard-person">
                        <span className="leaderboard-avatar">{initials(roommate.name)}</span>
                        <strong>{roommate.name}</strong>
                      </div>
                      <strong className="leaderboard-points">{points(roommate.points)}</strong>
                    </article>
                  ))}
                </section>
              </>
            )}
          </section>
        ) : (
          <section className="awards-empty-state">
            <div className="awards-empty-icon">🏆</div>
            <p className="eyebrow">HOUSEHOLD AWARDS</p>
            <h1 className="page-title">Your leaderboard awaits</h1>
            <p className="page-subtitle">Join a household to earn points, celebrate chores, and climb the leaderboard with your roommates.</p>
            <Link className="primary-button awards-join-button" to="/no-household">Join a household</Link>
          </section>
        )}
      </section>
    </main>
  );
}

export default AwardsPage;
