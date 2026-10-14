import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, logout as endSession } from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession();
        setUser(session.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function signOut() {
    await endSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ isLoading, setUser, signOut, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
