jest.mock('../db', () => ({
  getPool: jest.fn(),
}));

const { getPool } = require('../db');
const householdService = require('../services/householdService');

const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const MEMBER_ID = '33333333-3333-3333-3333-333333333333';

function householdRows(memberIds = [USER_ID], inviteCode = 'A1B2C3D4E5') {
  return memberIds.map((memberId) => ({
    id: HOUSEHOLD_ID,
    name: 'Roommates',
    inviteCode,
    memberId,
  }));
}

function createClient(query) {
  return { query, release: jest.fn() };
}

describe('household service with mocked database calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a household, attaches its creator, and returns the mapped household', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: householdRows() })
      .mockResolvedValueOnce({ rows: [] });
    const client = createClient(query);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });

    await expect(
      householdService.createHousehold(USER_ID, { name: 'Roommates' }),
    ).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: 'Roommates',
      inviteCode: expect.stringMatching(/^[0-9A-F]{10}$/),
      members: [USER_ID],
    });

    expect(query).toHaveBeenCalledWith('UPDATE users SET household_id = $1 WHERE id = $2', [
      HOUSEHOLD_ID,
      USER_ID,
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rejects a second household membership before looking up an invite code', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [] });
    const client = createClient(query);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });

    await expect(householdService.joinHousehold(USER_ID, 'A1B2C3D4E5')).rejects.toMatchObject({
      status: 409,
      message: 'You already belong to a household.',
    });

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2][0]).toBe('ROLLBACK');
  });

  test('joins a valid code and maps an unknown code to the wrong-code error', async () => {
    const successQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: householdRows([USER_ID, MEMBER_ID]) })
      .mockResolvedValueOnce({ rows: [] });
    const successClient = createClient(successQuery);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(successClient) });

    await expect(householdService.joinHousehold(MEMBER_ID, 'A1B2C3D4E5')).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: 'Roommates',
      inviteCode: 'A1B2C3D4E5',
      members: [USER_ID, MEMBER_ID],
    });

    const missingQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const missingClient = createClient(missingQuery);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(missingClient) });

    await expect(householdService.joinHousehold(MEMBER_ID, 'MISSING')).rejects.toMatchObject({
      status: 404,
      message: 'Wrong invite code.',
    });
  });

  test('returns only the current users household', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ household_id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: householdRows() });
    getPool.mockReturnValue({ query });

    await expect(householdService.getCurrentHousehold(USER_ID)).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: 'Roommates',
      inviteCode: 'A1B2C3D4E5',
      members: [USER_ID],
    });
  });

  test('clears only the leaver when other members remain', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [{ id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: MEMBER_ID }] })
      .mockResolvedValueOnce({ rows: [] });
    const client = createClient(query);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });

    await expect(householdService.leaveHousehold(USER_ID, HOUSEHOLD_ID)).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalledWith('DELETE FROM households WHERE id = $1', [
      HOUSEHOLD_ID,
    ]);
  });

  test('clears a leaver and deletes an empty household', async () => {
    const leaveQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [{ id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const leaveClient = createClient(leaveQuery);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(leaveClient) });

    await expect(householdService.leaveHousehold(USER_ID, HOUSEHOLD_ID)).resolves.toBeUndefined();
    expect(leaveQuery).toHaveBeenCalledWith('DELETE FROM households WHERE id = $1', [
      HOUSEHOLD_ID,
    ]);
  });

  test('rotates an invite code', async () => {
    const rotateQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ household_id: HOUSEHOLD_ID }] })
      .mockResolvedValueOnce({ rows: householdRows() })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: householdRows() })
      .mockResolvedValueOnce({ rows: [] });
    const rotateClient = createClient(rotateQuery);
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(rotateClient) });

    await expect(
      householdService.rotateInviteCode(USER_ID, HOUSEHOLD_ID),
    ).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: 'Roommates',
      inviteCode: 'A1B2C3D4E5',
      members: [USER_ID],
    });
  });
});
