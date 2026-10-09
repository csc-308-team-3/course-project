import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate('/board');
  }

  return (
    <main className="login-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="login-card">
        <div className="brand-mark">⌂</div>
        <p className="eyebrow">ROOMMATES, MADE EASIER</p>
        <h1>ChoreMate</h1>
        <p className="welcome-text">Do your chores, mate!</p>

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

          <button type="submit" className="login-button">
            Log In
          </button>
        </form>

        <div className="divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button type="button" className="google-button">
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