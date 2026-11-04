import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { getProfile, updateProfile } from '../services/profile';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatMonthAndYear(dateValue) {
  if (!dateValue) {
    return 'Not in a household yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function ProfilePage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { hasHousehold, leaveHousehold } = useHousehold();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfile();

        setProfile(data.profile);
        setForm({
          name: data.profile.name,
          email: data.profile.email,
        });
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function startEditing() {
    setForm({
      name: profile.name,
      email: profile.email,
    });
    setError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setForm({
      name: profile.name,
      email: profile.email,
    });
    setError('');
    setIsEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const data = await updateProfile(form);

      setProfile(data.profile);
      setForm({
        name: data.profile.name,
        email: data.profile.email,
      });

      // Update the signed-in user stored in AuthContext too.
      setUser((currentUser) => ({
        ...currentUser,
        name: data.profile.name,
        email: data.profile.email,
      }));

      setIsEditing(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleLeaveHousehold() {
    const householdName = profile?.household?.name ?? 'this household';

    const shouldLeave = window.confirm(
      `Are you sure you want to leave ${householdName}?`,
    );

    if (shouldLeave) {
      // This currently changes only frontend state.
      // Do not present it as permanent until a backend leave-household endpoint exists.
      leaveHousehold();
      navigate('/no-household');
    }
  }

  if (isLoading) {
    return (
      <main className="app-page profile-page">
        <p>Loading profile…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="app-page profile-page">
        <p>{error || 'Unable to load your profile.'}</p>
      </main>
    );
  }

  return (
    <main className="app-page profile-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card profile-card">
        <Navbar />

        <section className="profile-hero">
          <div className="profile-avatar">{getInitials(profile.name)}</div>

          <div>
            <p className="eyebrow">YOUR PROFILE</p>
            <h1 className="profile-name">{profile.name}</h1>
            <p className="page-subtitle">
              {profile.household
                ? `Member of ${profile.household.name}`
                : 'Not currently in a household'}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button profile-edit-button"
            onClick={startEditing}
          >
            Edit profile
          </button>
        </section>

        {error && <p className="form-error">{error}</p>}

        {isEditing && (
          <section className="profile-section">
            <p className="eyebrow">EDIT PROFILE</p>
            <h2>Update account details</h2>

            <form className="profile-info-card" onSubmit={handleSave}>
              <label>
                Name
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  minLength="1"
                  maxLength="100"
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="profile-layout">
          <div>
            <section className="profile-section">
              <p className="eyebrow">PROFILE INFORMATION</p>
              <h2>Account details</h2>

              <div className="profile-info-card">
                <div className="info-row">
                  <span>Email</span>
                  <strong>{profile.email}</strong>
                </div>

                <div className="info-row">
                  <span>Household member since</span>
                  <strong>
                    {formatMonthAndYear(profile.household?.joinedAt)}
                  </strong>
                </div>

                <div className="info-row">
                  <span>Chores completed</span>
                  <strong>{profile.completedChoreCount}</strong>
                </div>

                <div className="info-row">
                  <span>Household</span>
                  <strong>{profile.household?.name ?? 'None'}</strong>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <p className="eyebrow">SETTINGS</p>
              <h2>Preferences</h2>

              <div className="settings-list">
                <button type="button" className="setting-row" disabled>
                  Notification preferences <span>Coming soon</span>
                </button>

                <button type="button" className="setting-row" disabled>
                  Change password <span>Coming soon</span>
                </button>

                <button type="button" className="setting-row" disabled>
                  Privacy settings <span>Coming soon</span>
                </button>

                {hasHousehold && (
                  <button
                    type="button"
                    className="setting-row leave-household-button"
                    onClick={handleLeaveHousehold}
                  >
                    Leave household <span>›</span>
                  </button>
                )}
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
          </aside>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
