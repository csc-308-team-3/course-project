import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <main>
      <h1>ChoreMate</h1>
      <p>Sign in to view your household chores.</p>

      <button onClick={() => navigate('/board')}>Log In</button>
    </main>
  );
}

export default LoginPage;