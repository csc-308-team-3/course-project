import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';

function NoHouseholdPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { joinHousehold } = useHousehold();

  function handleSubmit(event) {
    event.preventDefault();

    const cleanedCode = inviteCode.trim().toUpperCase();

    if (!cleanedCode) {
      setError('Enter an invite code to join a household.');
      return;
    }

    if (joinHousehold(cleanedCode)) {
        navigate('/household');
        return;
    }

    setError(
      'We couldn’t find a household with that invite code. Check the code and try again.',
    );
  }

  return (
    <main className="app-page no-household-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card no-household-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions">
            <Link className="nav-button active-nav-button" to="/no-household">
                Household
            </Link>
            <Link className="nav-button" to="/awards">
                Awards
            </Link>
            <Link className="nav-button" to="/profile">
                Profile
            </Link>
            <Link className="text-button" to="/">
                Log out
            </Link>
          </nav>
        </header>

        <div className="no-household-content">
          <p className="eyebrow">WELCOME TO CHOREMATE</p>
          <h1 className="page-title">No household yet</h1>
          <p className="page-subtitle">
            Enter an invite code to join your roommates!
          </p>

          <form className="invite-form" onSubmit={handleSubmit}>
            <label htmlFor="invite-code">Household invite code</label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(event) => {
                setInviteCode(event.target.value);
                setError('');
              }}
              placeholder="Example: A1B2C3"
              maxLength="6"
            />

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="primary-button">
              Join household
            </button>
          </form>

          <div className="divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <button type="button" className="secondary-button" disabled>
            Create a household — coming soon
          </button>
        </div>
      </section>
    </main>
  );
}

export default NoHouseholdPage;