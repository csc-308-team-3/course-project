import { useEffect, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { getLeaderboard } from '../services/leaderboard';
import { createChoreSwapRequest } from '../services/choreSwapRequests';

function ChoreSwapRequestPage() {
  const { choreInstanceId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household } = useHousehold();
  const [roommates, setRoommates] = useState([]);
  const [recipientId, setRecipientId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const chore = state?.chore;

  useEffect(() => {
    async function loadRoommates() {
      try {
        const leaderboard = await getLeaderboard(household.id);
        setRoommates(
          leaderboard.members.filter((roommate) => roommate.id !== user.id),
        );
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadRoommates();
  }, [household.id, user.id]);

  if (!chore) {
    return <Navigate to="/household" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createChoreSwapRequest(household.id, choreInstanceId, recipientId);
      navigate('/household');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-page">
      <section className="app-card chore-swap-card">
        <Navbar />

        <section className="chore-swap-content">
          <p className="eyebrow">CHORE SWAP REQUEST</p>
          <h1 className="page-title chore-swap-title">Swap {chore.title}</h1>
          <p className="page-subtitle">Due {chore.dueDate}</p>

          <form onSubmit={handleSubmit}>
            <fieldset
              className="roommate-picker"
              disabled={loading || submitting}
            >
              <legend>Choose a roommate</legend>

              {loading && <p>Loading roommates...</p>}

              {!loading && roommates.length === 0 && (
                <p>No other roommates are available.</p>
              )}

              {!loading &&
                roommates.map((roommate) => (
                  <label className="roommate-option" key={roommate.id}>
                    <input
                      type="radio"
                      name="recipient"
                      value={roommate.id}
                      checked={recipientId === roommate.id}
                      onChange={(event) => setRecipientId(event.target.value)}
                    />
                    {roommate.name}
                  </label>
                ))}
            </fieldset>

            {error && <p className="form-error">{error}</p>}

            <div className="chore-swap-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate('/household')}
              >
                Back
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={!recipientId || submitting}
              >
                {submitting ? 'Sending...' : 'Confirm request'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

export default ChoreSwapRequestPage;
