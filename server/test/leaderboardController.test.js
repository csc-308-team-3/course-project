jest.mock('../services/leaderboardService', () => ({
  getHouseholdLeaderboard: jest.fn(),
}));

const leaderboardService = require('../services/leaderboardService');
const { getLeaderboard } = require('../controllers/leaderboardController');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_HOUSEHOLD_ID = '33333333-3333-3333-3333-333333333333';

function createResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

describe('getLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when there is no authenticated user', async () => {
    const response = createResponse();

    await getLeaderboard(
      { params: { householdId: HOUSEHOLD_ID }, user: null },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Authentication is required.',
    });
    expect(leaderboardService.getHouseholdLeaderboard).not.toHaveBeenCalled();
  });

  test('returns 403 when the user requests another households leaderboard', async () => {
    const response = createResponse();

    await getLeaderboard(
      {
        params: { householdId: HOUSEHOLD_ID },
        user: { id: USER_ID, householdId: OTHER_HOUSEHOLD_ID },
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: 'You are not a member of this household.',
    });
    expect(leaderboardService.getHouseholdLeaderboard).not.toHaveBeenCalled();
  });

  test('returns 400 when household ID is invalid', async () => {
    const response = createResponse();

    await getLeaderboard(
      {
        params: { householdId: 'not-a-uuid' },
        user: { id: USER_ID, householdId: HOUSEHOLD_ID },
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'A valid household ID is required.',
    });
    expect(leaderboardService.getHouseholdLeaderboard).not.toHaveBeenCalled();
  });

  test('returns leaderboard data when service succeeds', async () => {
    const leaderboard = {
      householdId: HOUSEHOLD_ID,
      scoringRule: 'Each completed chore assigned to a roommate is worth 1 point.',
      leaderboard: [],
    };
    leaderboardService.getHouseholdLeaderboard.mockResolvedValue(leaderboard);
    const response = createResponse();

    await getLeaderboard(
      {
        params: { householdId: HOUSEHOLD_ID },
        user: { id: USER_ID, householdId: HOUSEHOLD_ID },
      },
      response,
    );

    expect(leaderboardService.getHouseholdLeaderboard).toHaveBeenCalledWith(
      HOUSEHOLD_ID,
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(leaderboard);
  });

  test('returns 404 when household does not exist', async () => {
    leaderboardService.getHouseholdLeaderboard.mockResolvedValue(null);
    const response = createResponse();

    await getLeaderboard(
      {
        params: { householdId: HOUSEHOLD_ID },
        user: { id: USER_ID, householdId: HOUSEHOLD_ID },
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: 'Household not found.' });
  });

  test('returns 500 when the service throws unexpectedly', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    leaderboardService.getHouseholdLeaderboard.mockRejectedValue(
      new Error('database unavailable'),
    );
    const response = createResponse();

    await getLeaderboard(
      {
        params: { householdId: HOUSEHOLD_ID },
        user: { id: USER_ID, householdId: HOUSEHOLD_ID },
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Unable to load the household leaderboard.',
    });
    errorSpy.mockRestore();
  });
});
