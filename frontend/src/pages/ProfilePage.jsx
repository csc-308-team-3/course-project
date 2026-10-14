import { Link, useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useHousehold } from '../context/HouseholdContext';

function ProfilePage() {
  const navigate = useNavigate();
  const { hasHousehold, leaveHousehold } = useHousehold();

  function handleLeaveHousehold() {
    const shouldLeave = window.confirm(
      'Are you sure you want to leave Gary Chiu’s House?',
    );

    if (shouldLeave) {
      leaveHousehold();
      navigate('/no-household');
    }
  }
  return (
    <main className="app-page profile-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card profile-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions">
            <Link className="nav-button" to="/household">
              Household
            </Link>
            <Link className="nav-button" to="/awards">
                Awards
            </Link>
            <Link className="nav-button active-nav-button" to="/profile">
              Profile
            </Link>
            <LogoutButton />
          </nav>
        </header>

        <section className="profile-hero">
          <div className="profile-avatar">GC</div>

          <div>
            <p className="eyebrow">YOUR PROFILE</p>
            <h1 className="profile-name">Gary Chiu</h1>
            <p className="page-subtitle">
              Member of Gary Chiu's House
            </p>
          </div>

          <button type="button" className="secondary-button profile-edit-button">
            Edit profile
          </button>
        </section>

        <div className="profile-layout">
          <div>
            <section className="profile-section">
              <p className="eyebrow">PROFILE INFORMATION</p>
              <h2>Account details</h2>

              <div className="profile-info-card">
                <div className="info-row">
                  <span>Email</span>
                  <strong>gary@example.com</strong>
                </div>
                <div className="info-row">
                  <span>Member since</span>
                  <strong>October 2026</strong>
                </div>
                <div className="info-row">
                  <span>Chores completed</span>
                  <strong>12</strong>
                </div>
                <div className="info-row">
                  <span>Household</span>
                  <strong>Gary Chiu's House</strong>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <p className="eyebrow">SETTINGS</p>
              <h2>Preferences</h2>

              <div className="settings-list">
                <button type="button" className="setting-row">
                  Notification preferences <span>›</span>
                </button>
                <button type="button" className="setting-row">
                  Change password <span>›</span>
                </button>
                <button type="button" className="setting-row">
                  Privacy settings <span>›</span>
                </button>
                {hasHousehold && (
                  <button
                    type="button"
                    className="setting-row leave-household-button"
                    onClick={handleLeaveHousehold}
                  >
                    Leave household <span>›</span>
                  </button> )}
              </div>
            </section>
          </div>

          <aside className="awards-card">
            <p className="eyebrow">ACHIEVEMENTS</p>
            <h2>Chore awards</h2>

            <div className="award-item">
              <span>🌱</span>
              <div>
                <strong>The First of Many</strong>
                <p>Completed your first chore</p>
              </div>
            </div>

            <div className="award-item">
              <span>✨</span>
              <div>
                <strong>Streak Starter</strong>
                <p>Three-week chore streak</p>
              </div>
            </div>

            <div className="award-item">
              <span>🧼</span>
              <div>
                <strong>Clean Machine</strong>
                <p>Keep the common areas fresh</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
