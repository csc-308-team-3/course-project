import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/auth';
import '../styles/auth.css';

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { user } = await login({ email, password });
      setUser(user);
      navigate(user.householdId ? '/household' : '/no-household');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card auth-card">
        <div className="brand-mark">⌂</div>
        <p className="eyebrow">WHOSE CHORE IS IT?</p>
        <h1 className="page-title">ChoreMate</h1>
        <p className="page-subtitle">Do your chores, mate!</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div className="password-row">
            <label htmlFor="password">Password</label>
            <button type="button" className="text-button">
              Forgot password?
            </button>
          </div>

          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <div className="divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button type="button" className="secondary-button">
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        <p className="create-account">
            New here? <button type="button" onClick={() => navigate('/register')}>
            Create an account
            </button>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
