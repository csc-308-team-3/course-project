import { createContext, useContext, useState } from 'react';

const ChoreContext = createContext();

const startingChores = [
  {
    id: 'wash-dishes',
    title: 'Wash dishes',
    roommate: 'Gary Chiu',
    category: 'Kitchen',
    instructions:
      'Wash 4 small bowls and 2 large plates. Place them on the dry rack after washing, then return them to the cabinets after drying.',
    dueDate: 'Oct. 14',
    icon: '🍽',
    status: 'due',
  },
  {
    id: 'buy-groceries',
    title: 'Buy groceries',
    roommate: 'Omar Mohamed',
    category: 'Shopping',
    instructions:
      'Can you get us another jar of Lao Gan Ma, two loaves of sourdough bread, a bottle of soy sauce, six or seven bananas, a box of Cinnamon Toast Crunch, three ripe avocados, two dozens of eggs, two gallons of lactose-free milk, and a bag of shredded mozzarella cheese? Thanks! ',
    dueDate: 'Oct. 16',
    icon: '🛒',
    status: 'todo',
  },
  {
    id: 'debug-wifi',
    title: 'Debug the Wi-Fi',
    roommate: 'Chris Zielke',
    category: 'Technology',
    instructions:
      'Restart the router, check the cables, and make sure the Wi-Fi is ready before our software programming presentation! Only Chris Zielke can complete this task.',
    dueDate: 'Oct. 12',
    icon: '⚙',
    status: 'complete',
  },
];

export function ChoreProvider({ children }) {
  const [chores, setChores] = useState(startingChores);

  function updateChoreStatus(choreId, newStatus) {
    setChores((currentChores) =>
      currentChores.map((chore) =>
        chore.id === choreId ? { ...chore, status: newStatus } : chore,
      ),
    );
  }

  return (
    <ChoreContext.Provider value={{ chores, updateChoreStatus }}>
      {children}
    </ChoreContext.Provider>
  );
}

export function useChores() {
  return useContext(ChoreContext);
}