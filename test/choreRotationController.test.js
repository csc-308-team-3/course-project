jest.mock('../server/services/choreRotationService', () => {
  class ChoreRotationServiceError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }

  return {
    ChoreRotationServiceError,
    generateChoreRotations: jest.fn(),
  };
});

const choreRotationService = require('../server/services/choreRotationService');
const {
  generateChoreRotations: generateChoreRotationsController,
} = require('../server/controllers/choreRotationController');

function createResponse() {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe('generateChoreRotations controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends the authenticated user, household, and date range to the service', async () => {
    const rotationResult = {
      generatedCount: 2,
      generatedAssignments: [],
      skippedChores: [],
    };

    choreRotationService.generateChoreRotations.mockResolvedValue(
      rotationResult,
    );

    const request = {
      user: { id: 'user-123' },
      params: { householdId: 'household-456' },
      body: {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      },
    };
    const response = createResponse();

    await generateChoreRotationsController(request, response);

    expect(choreRotationService.generateChoreRotations).toHaveBeenCalledWith(
      'user-123',
      'household-456',
      {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      },
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(rotationResult);
  });

    test('returns the service error status and message', async () => {
    choreRotationService.generateChoreRotations.mockRejectedValue(
      new choreRotationService.ChoreRotationServiceError(
        403,
        'You are not a member of this household.',
      ),
    );

    const request = {
      user: { id: 'user-from-another-household' },
      params: { householdId: 'household-456' },
      body: {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      },
    };
    const response = createResponse();

    await generateChoreRotationsController(request, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: 'You are not a member of this household.',
    });
  });
});