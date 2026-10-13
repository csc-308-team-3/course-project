const { getWeeklyRange } = require('../utils/week');

const validStatuses = ['todo', 'due', 'complete'];

function groupChoresByRoommateAndStatus(chores) {
  const roommates = new Map();

  chores.forEach((chore) => {
    if (!validStatuses.includes(chore.status)) {
      throw new Error(`Invalid chore status: ${chore.status}`);
    }

    if (!roommates.has(chore.roommateId)) {
      roommates.set(chore.roommateId, {
        id: chore.roommateId,
        name: chore.roommateName,
        chores: {
          todo: [],
          due: [],
          complete: [],
        },
      });
    }

    roommates.get(chore.roommateId).chores[chore.status].push({
      id: chore.id,
      title: chore.title,
      category: chore.category,
      dueDate: chore.dueDate,
    });
  });

  return [...roommates.values()];
}

function buildWeeklyBoard(weekStart, chores) {
  const { weekEnd } = getWeeklyRange(weekStart);

  return {
    weekStart,
    weekEnd,
    roommates: groupChoresByRoommateAndStatus(chores),
  };
}

module.exports = {
  buildWeeklyBoard,
  groupChoresByRoommateAndStatus,
};