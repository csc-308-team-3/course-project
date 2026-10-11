import { createContext, useContext, useState } from 'react';

const HouseholdContext = createContext();

export function HouseholdProvider({ children }) {
  const [hasHousehold, setHasHousehold] = useState(() => {
    return localStorage.getItem('choremate-has-household') === 'true';
  });

  function joinHousehold(code) {
    if (code !== 'A1B2C3') {
      return false;
    }

    localStorage.setItem('choremate-has-household', 'true');
    setHasHousehold(true);
    return true;
  }

  function leaveHousehold() {
    localStorage.removeItem('choremate-has-household');
    setHasHousehold(false);
  }

  return (
    <HouseholdContext.Provider value={{ hasHousehold, joinHousehold, leaveHousehold }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return useContext(HouseholdContext);
}