import { createContext, useContext, useEffect, useState } from 'react';

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
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshHousehold() {
    setLoading(true);

    try {
      const data = await request('/me');
      setHousehold(data.household);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshHousehold().catch(() => setHousehold(null));
  }, []);

  async function createHousehold(name) {
    const data = await request('', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setHousehold(data.household);
  }

  async function joinHousehold(inviteCode) {
    const data = await request('/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
    setHousehold(data.household);
  }

  async function leaveHousehold() {
    await request(`/${household.id}/leave`, { method: 'POST' });
    setHousehold(null);
  }

  return (
    <HouseholdContext.Provider
      value={{
        household,
        hasHousehold: Boolean(household),
        loading,
        createHousehold,
        joinHousehold,
        leaveHousehold,
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
