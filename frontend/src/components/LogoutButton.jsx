import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LogoutButton() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  }

  return (
    <button type="button" className="text-button" onClick={handleLogout}>
      Log out
    </button>
  );
}

export default LogoutButton;
