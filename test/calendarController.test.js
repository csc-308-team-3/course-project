jest.mock('../server/services/calendarService', () => {
  class CalendarServiceError extends Error {
    constructor(status, message) {
      super(message);
      this.name = 'CalendarServiceError';
      this.status = status;
    }
  }

  return {
    CalendarServiceError,
    getCalendarChores: jest.fn(),
  };
});

const calendarService = require('../server/services/calendarService');
const {
  getCalendarChores,
} = require('../server/controllers/calendarController');

function createResponse() {
  const response = {};

  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe('getCalendarChores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns calendar chores for a valid date range', async () => {
    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    const chores = [
      {
        id: '33333333-3333-3333-3333-333333333333',
        choreId: '44444444-4444-4444-4444-444444444444',
        title: 'Wash dishes',
        category: 'Kitchen',
        assigneeId: userId,
        assigneeName: 'Chris Zielke',
        dueDate: '2026-10-27',
        status: 'assigned',
      },
    ];

    calendarService.getCalendarChores.mockResolvedValue(chores);

    const request = {
      user: { id: userId },
      params: { householdId },
      query: {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
      },
    };
    const response = createResponse();

    await getCalendarChores(request, response);

    expect(calendarService.getCalendarChores).toHaveBeenCalledWith(
      userId,
      householdId,
      {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        roommateId: undefined,
      },
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      householdId,
      startDate: '2026-10-26',
      endDate: '2026-11-01',
      roommateId: undefined,
      chores,
    });
  });

  test('rejects an invalid calendar date before loading chores', async () => {
    const request = {
        user: { id: '22222222-2222-2222-2222-222222222222' },
        params: {
        householdId: '11111111-1111-1111-1111-111111111111',
        },
        query: {
        startDate: '2026-02-30',
        endDate: '2026-03-01',
        },
    };
    const response = createResponse();

    await getCalendarChores(request, response);

    expect(calendarService.getCalendarChores).not.toHaveBeenCalled();

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
        error: 'Invalid calendar query.',
        details: ['startDate must use the YYYY-MM-DD format.'],
        });
    });

  test('passes an optional roommate filter to the calendar service', async () => {
    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';
    const roommateId = '33333333-3333-3333-3333-333333333333';

    calendarService.getCalendarChores.mockResolvedValue([]);

    const request = {
        user: { id: userId },
        params: { householdId },
        query: {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        roommateId,
        },
    };
    const response = createResponse();

    await getCalendarChores(request, response);

    expect(calendarService.getCalendarChores).toHaveBeenCalledWith(
        userId,
        householdId,
        {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        roommateId,
        },
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
        householdId,
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        roommateId,
        chores: [],
    });
  });
  test('returns the service authorization error', async () => {
    calendarService.getCalendarChores.mockRejectedValue(
        new calendarService.CalendarServiceError(
        403,
        'You are not a member of this household.',
        ),
    );

    const request = {
        user: { id: '22222222-2222-2222-2222-222222222222' },
        params: {
        householdId: '11111111-1111-1111-1111-111111111111',
        },
        query: {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        },
    };
    const response = createResponse();

    await getCalendarChores(request, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
        error: 'You are not a member of this household.',
    });
  });
});