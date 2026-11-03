jest.mock('../server/services/announcementService', () => {
  class AnnouncementServiceError extends Error {
    constructor(status, message) {
      super(message);
      this.name = 'AnnouncementServiceError';
      this.status = status;
    }
  }

  return {
    AnnouncementServiceError,
    deleteWeeklyAnnouncement: jest.fn(),
    getWeeklyAnnouncement: jest.fn(),
    saveWeeklyAnnouncement: jest.fn(),
  };
});

const announcementService = require('../server/services/announcementService');
const {
  deleteWeeklyAnnouncement,
  getWeeklyAnnouncement,
  saveWeeklyAnnouncement,
} = require('../server/controllers/announcementController');

function createResponse() {
  const response = {};

  response.send = jest.fn().mockReturnValue(response);
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);

  return response;
}

describe('weekly announcement controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns an announcement for a valid household and week', async () => {
    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    const announcement = {
      id: '33333333-3333-3333-3333-333333333333',
      weekStart: '2026-11-02',
      message: 'Remember to take out the trash!',
    };

    announcementService.getWeeklyAnnouncement.mockResolvedValue(
      announcement,
    );

    const request = {
      user: { id: userId },
      params: { householdId },
      query: { weekStart: '2026-11-02' },
    };
    const response = createResponse();

    await getWeeklyAnnouncement(request, response);

    expect(announcementService.getWeeklyAnnouncement).toHaveBeenCalledWith(
      userId,
      householdId,
      '2026-11-02',
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ announcement });
  });

  test('saves a valid announcement', async () => {
    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    const announcement = {
      id: '33333333-3333-3333-3333-333333333333',
      weekStart: '2026-11-02',
      message: 'Remember to take out the trash!',
    };

    announcementService.saveWeeklyAnnouncement.mockResolvedValue(
      announcement,
    );

    const request = {
      user: { id: userId },
      params: { householdId },
      body: {
        weekStart: '2026-11-02',
        message: 'Remember to take out the trash!',
      },
    };
    const response = createResponse();

    await saveWeeklyAnnouncement(request, response);

    expect(announcementService.saveWeeklyAnnouncement).toHaveBeenCalledWith(
      userId,
      householdId,
      {
        weekStart: '2026-11-02',
        message: 'Remember to take out the trash!',
      },
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ announcement });
  });

  test('rejects an announcement message longer than 75 characters', async () => {
    const request = {
      user: { id: '22222222-2222-2222-2222-222222222222' },
      params: {
        householdId: '11111111-1111-1111-1111-111111111111',
      },
      body: {
        weekStart: '2026-11-02',
        message: 'a'.repeat(76),
      },
    };
    const response = createResponse();

    await saveWeeklyAnnouncement(request, response);

    expect(announcementService.saveWeeklyAnnouncement).not.toHaveBeenCalled();

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Invalid announcement.',
      details: ['Announcement message must be 75 characters or fewer.'],
    });
  });

  test('returns a household authorization error from the service', async () => {
    announcementService.getWeeklyAnnouncement.mockRejectedValue(
      new announcementService.AnnouncementServiceError(
        403,
        'You are not a member of this household.',
      ),
    );

    const request = {
      user: { id: '22222222-2222-2222-2222-222222222222' },
      params: {
        householdId: '11111111-1111-1111-1111-111111111111',
      },
      query: { weekStart: '2026-11-02' },
    };
    const response = createResponse();

    await getWeeklyAnnouncement(request, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: 'You are not a member of this household.',
    });
  });

  test('deletes an announcement for a valid household and week', async () => {
    const householdId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    announcementService.deleteWeeklyAnnouncement.mockResolvedValue();

    const request = {
      user: { id: userId },
      params: { householdId },
      query: { weekStart: '2026-11-02' },
    };
    const response = createResponse();

    await deleteWeeklyAnnouncement(request, response);

    expect(announcementService.deleteWeeklyAnnouncement).toHaveBeenCalledWith(
      userId,
      householdId,
      '2026-11-02',
    );

    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });
});