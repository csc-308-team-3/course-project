import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';

function RegisterPage() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate('/board');
  }

  return (
    <main className="app-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card auth-card">
        <div className="brand-mark">⌂</div>
        <p className="eyebrow">READY TO SHARE THE LOAD?</p>
        <h1 className="page-title">ChoreMate</h1>
        <p className="page-subtitle">
          Let’s create your ChoreMate account, mate!
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" placeholder="Your name" required />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" required />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            required
          />

          <button type="submit" className="primary-button">
            Create Account
          </button>
        </form>

        <p className="create-account">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/')}>
            Log in
          </button>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;