import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useHousehold } from '../context/HouseholdContext';

function NoHouseholdPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();
  const { createHousehold, joinHousehold } = useHousehold();

  async function handleJoin(event) {
    event.preventDefault();

    if (!inviteCode.trim()) {
      setJoinError('Enter an invite code to join a household.');
      return;
    }

    try {
      await joinHousehold(inviteCode);
      navigate('/household');
    } catch (error) {
      setJoinError(error.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!householdName.trim()) {
      setCreateError('Enter a household name.');
      return;
    }

    try {
      await createHousehold(householdName);
      navigate('/household');
    } catch (error) {
      setCreateError(error.message);
    }
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
            <LogoutButton />
          </nav>
        </header>

        <div className="no-household-content">
          <p className="eyebrow">WELCOME TO CHOREMATE</p>
          <h1 className="page-title">No household yet</h1>
          <p className="page-subtitle">
            Enter an invite code to join your roommates!
          </p>

          <form className="invite-form" onSubmit={handleJoin}>
            <label htmlFor="invite-code">Household invite code</label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(event) => {
                setInviteCode(event.target.value);
                setJoinError('');
              }}
              placeholder="Example: A1B2C3"
            />

            {joinError && <p className="form-error">{joinError}</p>}

            <button type="submit" className="primary-button">
              Join household
            </button>
          </form>

          <div className="divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <form className="invite-form" onSubmit={handleCreate}>
            <label htmlFor="household-name">Household name</label>
            <input
              id="household-name"
              type="text"
              value={householdName}
              onChange={(event) => {
                setHouseholdName(event.target.value);
                setCreateError('');
              }}
              placeholder="Example: Gary Chiu's House"
            />

            {createError && <p className="form-error">{createError}</p>}

            <button type="submit" className="secondary-button">
              Create household
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default NoHouseholdPage;
