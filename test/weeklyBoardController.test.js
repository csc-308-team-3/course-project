jest.mock('../server/db', () => ({
  getPool: jest.fn(),
}));

const { getPool } = require('../server/db');
const {
  getWeeklyBoard,
} = require('../server/controllers/weeklyBoardController');

function createResponse() {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe('getWeeklyBoard', () => {
  const householdId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns a weekly board from the database rows', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          roommateId: '33333333-3333-3333-3333-333333333333',
          roommateName: 'Chris Zielke',
          title: 'Fix Wi-Fi',
          category: 'weekly',
          dueDate: '2026-10-14',
          status: 'todo',
        },
      ],
    });

    getPool.mockReturnValue({ query });

    const request = {
      params: { householdId },
      query: { weekStart: '2026-10-12' },
    };
    const response = createResponse();

    await getWeeklyBoard(request, response);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      [householdId, '2026-10-12', '2026-10-19'],
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      householdId,
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      roommates: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Chris Zielke',
          chores: {
            todo: [
              {
                id: '22222222-2222-2222-2222-222222222222',
                title: 'Fix Wi-Fi',
                category: 'weekly',
                dueDate: '2026-10-14',
              },
            ],
            due: [],
            complete: [],
          },
        },
      ],
    });
  });

  test('rejects an invalid household ID before querying the database', async () => {
    const request = {
      params: { householdId: 'not-a-uuid' },
      query: { weekStart: '2026-10-12' },
    };
    const response = createResponse();

    await getWeeklyBoard(request, response);

    expect(getPool).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'A valid household ID is required.',
    });
  });
  test('returns a server error when the database query fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const query = jest
      .fn()
      .mockRejectedValue(new Error('Database connection failed'));

    getPool.mockReturnValue({ query });

    const request = {
      params: { householdId },
      query: { weekStart: '2026-10-12' },
    };
    const response = createResponse();

    await getWeeklyBoard(request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Unable to load the weekly chore board.',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Weekly board query failed.',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});