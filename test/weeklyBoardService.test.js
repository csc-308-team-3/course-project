const { buildWeeklyBoard } = require('../server/services/weeklyBoardService');

describe('buildWeeklyBoard', () => {
  test('groups chores by roommate and status', () => {
    const chores = [
      {
        id: 1,
        title: 'Fix Wi-Fi',
        category: 'Technology',
        dueDate: '2026-10-13',
        status: 'due',
        roommateId: 1,
        roommateName: 'Chris Zielke',
      },
      {
        id: 2,
        title: 'Take out trash',
        category: 'Cleaning',
        dueDate: '2026-10-14',
        status: 'complete',
        roommateId: 1,
        roommateName: 'Chris Zielke',
      },
      {
        id: 3,
        title: 'Buy groceries',
        category: 'Shopping',
        dueDate: '2026-10-15',
        status: 'todo',
        roommateId: 2,
        roommateName: 'Gary Chiu',
      },
    ];

    expect(buildWeeklyBoard('2026-10-12', chores)).toEqual({
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      roommates: [
        {
          id: 1,
          name: 'Chris Zielke',
          chores: {
            todo: [],
            due: [
              {
                id: 1,
                title: 'Fix Wi-Fi',
                category: 'Technology',
                dueDate: '2026-10-13',
              },
            ],
            complete: [
              {
                id: 2,
                title: 'Take out trash',
                category: 'Cleaning',
                dueDate: '2026-10-14',
              },
            ],
          },
        },
        {
          id: 2,
          name: 'Gary Chiu',
          chores: {
            todo: [
              {
                id: 3,
                title: 'Buy groceries',
                category: 'Shopping',
                dueDate: '2026-10-15',
              },
            ],
            due: [],
            complete: [],
          },
        },
      ],
    });
  });

  test('returns an empty roommates list when a week has no chores', () => {
    expect(buildWeeklyBoard('2026-10-12', [])).toEqual({
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      roommates: [],
    });
  });

  test('rejects an invalid chore status', () => {
    const chores = [
      {
        id: 1,
        title: 'Wash dishes',
        category: 'Kitchen',
        dueDate: '2026-10-13',
        status: 'late',
        roommateId: 1,
        roommateName: 'Chris Zielke',
      },
    ];

    expect(() => buildWeeklyBoard('2026-10-12', chores)).toThrow(
      'Invalid chore status: late'
    );
  });
});