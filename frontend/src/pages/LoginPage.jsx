import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';

function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate('/household');
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
            required
          />

          <div className="password-row">
            <label htmlFor="password">Password</label>
            <button type="button" className="text-button">
              Forgot password?
            </button>
          </div>

          <input id="password" type="password" placeholder="••••••••" required />

          <button type="submit" className="primary-button">
            Log In
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