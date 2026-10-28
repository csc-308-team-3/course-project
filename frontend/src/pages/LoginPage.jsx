import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, loginWithGoogle } from '../services/auth';
import '../styles/auth.css';

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
  });
}

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const googleButtonRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleCredential = useCallback(
    async ({ credential }) => {
      setError('');
      setIsSubmitting(true);

      try {
        const { user } = await loginWithGoogle(credential);
        setUser(user);
        navigate(user.householdId ? '/household' : '/no-household');
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, setUser],
  );

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return undefined;
    }

    let isMounted = true;

    loadGoogleIdentityServices()
      .then(() => {
        if (!isMounted || !googleButtonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          callback: handleGoogleCredential,
          client_id: clientId,
          ux_mode: 'popup',
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          logo_alignment: 'left',
          shape: 'rectangular',
          size: 'large',
          text: 'signin_with',
          theme: 'outline',
          type: 'standard',
          width: Math.min(400, googleButtonRef.current.clientWidth),
        });
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load Google sign-in. Please try again.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [handleGoogleCredential]);

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

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <div className="divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div className="google-signin" ref={googleButtonRef} />
        ) : (
          <p className="form-error" role="alert">
            Google sign-in is not configured.
          </p>
        )}

        <p className="create-account">
          New here?{' '}
          <button type="button" onClick={() => navigate('/register')}>
            Create an account
          </button>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
