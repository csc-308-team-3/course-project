jest.mock('../services/householdService', () => {
  class HouseholdServiceError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  return {
    HouseholdServiceError,
    createHousehold: jest.fn(),
    getCurrentHousehold: jest.fn(),
    joinHousehold: jest.fn(),
    leaveHousehold: jest.fn(),
    rotateInviteCode: jest.fn(),
  };
});

const householdService = require('../services/householdService');
const {
  createHousehold,
  getCurrentHousehold,
  joinHousehold,
  leaveHousehold,
  requireAuthenticatedUser,
  requireValidHouseholdId,
  rotateInviteCode,
} = require('../controllers/householdController');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';
const household = {
  id: HOUSEHOLD_ID,
  name: 'Roommates',
  inviteCode: 'A1B2C3D4E5',
  members: [USER_ID],
};

function createResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  response.send = jest.fn().mockReturnValue(response);
  return response;
}

function authenticatedRequest(overrides = {}) {
  return {
    user: { id: USER_ID },
    params: {},
    body: {},
    ...overrides,
  };
}

describe('household controller with mocked service calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires an authenticated user before every household route', () => {
    const response = createResponse();
    const next = jest.fn();

    requireAuthenticatedUser({ user: null }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Authentication is required.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid household ID before invoking leave or rotation services', () => {
    const response = createResponse();
    const next = jest.fn();

    requireValidHouseholdId({ params: { householdId: 'not-a-uuid' } }, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'A valid household ID is required.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('validates a household name before creating a household', async () => {
    const response = createResponse();

    await createHousehold(authenticatedRequest({ body: { name: '   ' } }), response);

    expect(householdService.createHousehold).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Invalid household.',
      details: ['name is required and must be a non-empty string.'],
    });
  });

  test('creates a household with the service result', async () => {
    const response = createResponse();
    householdService.createHousehold.mockResolvedValue(household);

    await createHousehold(authenticatedRequest({ body: { name: ' Roommates ' } }), response);

    expect(householdService.createHousehold).toHaveBeenCalledWith(USER_ID, {
      name: 'Roommates',
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ household });
  });

  test('normalizes an invite code and returns a wrong-code error', async () => {
    const response = createResponse();
    householdService.joinHousehold.mockRejectedValue(
      new householdService.HouseholdServiceError(404, 'Wrong invite code.'),
    );

    await joinHousehold(
      authenticatedRequest({ body: { inviteCode: ' missing ' } }),
      response,
    );

    expect(householdService.joinHousehold).toHaveBeenCalledWith(USER_ID, 'MISSING');
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: 'Wrong invite code.' });
  });

  test('returns the current household and maps service authorization errors', async () => {
    const successResponse = createResponse();
    householdService.getCurrentHousehold.mockResolvedValue(household);

    await getCurrentHousehold(authenticatedRequest(), successResponse);

    expect(householdService.getCurrentHousehold).toHaveBeenCalledWith(USER_ID);
    expect(successResponse.status).toHaveBeenCalledWith(200);
    expect(successResponse.json).toHaveBeenCalledWith({ household });

    const errorResponse = createResponse();
    householdService.getCurrentHousehold.mockRejectedValue(
      new householdService.HouseholdServiceError(403, 'Not allowed.'),
    );

    await getCurrentHousehold(authenticatedRequest(), errorResponse);

    expect(errorResponse.status).toHaveBeenCalledWith(403);
    expect(errorResponse.json).toHaveBeenCalledWith({ error: 'Not allowed.' });
  });

  test('leaves a household with a 204 response', async () => {
    const response = createResponse();
    householdService.leaveHousehold.mockResolvedValue();

    await leaveHousehold(
      authenticatedRequest({ params: { householdId: HOUSEHOLD_ID } }),
      response,
    );

    expect(householdService.leaveHousehold).toHaveBeenCalledWith(USER_ID, HOUSEHOLD_ID);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });

  test('rotates an invite code and maps conflicts without exposing internals', async () => {
    const response = createResponse();
    householdService.rotateInviteCode.mockRejectedValue(
      new householdService.HouseholdServiceError(
        409,
        'You already belong to a household.',
      ),
    );

    await rotateInviteCode(
      authenticatedRequest({ params: { householdId: HOUSEHOLD_ID } }),
      response,
    );

    expect(householdService.rotateInviteCode).toHaveBeenCalledWith(USER_ID, HOUSEHOLD_ID);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: 'You already belong to a household.',
    });
  });
});
