import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

const HouseholdContext = createContext();

async function request(path, options = {}) {
  const response = await fetch(`/api/households${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to update household.');
  }

  return data;
}

export function HouseholdProvider({ children }) {
  const { isLoading: authLoading, setUser, user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshHousehold = useCallback(async () => {
    if (!user?.id) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await request('/me');
      setHousehold(data.household);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      refreshHousehold().catch(() => setHousehold(null));
    }
  }, [authLoading, refreshHousehold]);

  function updateUserHousehold(householdId) {
    setUser((currentUser) =>
      currentUser ? { ...currentUser, householdId } : currentUser,
    );
  }

  async function createHousehold(name) {
    const data = await request('', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setHousehold(data.household);
    updateUserHousehold(data.household.id);
  }

  async function joinHousehold(inviteCode) {
    const data = await request('/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
    setHousehold(data.household);
    updateUserHousehold(data.household.id);
  }

  async function leaveHousehold() {
    await request(`/${household.id}/leave`, { method: 'POST' });
    setHousehold(null);
    updateUserHousehold(null);
  }

  return (
    <HouseholdContext.Provider
      value={{
        createHousehold,
        hasHousehold: Boolean(household),
        household,
        joinHousehold,
        leaveHousehold,
        loading,
        refreshHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
