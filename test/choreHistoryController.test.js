jest.mock('../server/services/choreHistoryService', () => {
  const actual = jest.requireActual('../server/services/choreHistoryService');

  return {
    ...actual,
    completeChoreInstance: jest.fn(),
    getChoreHistory: jest.fn(),
    getMonthlyStatistics: jest.fn(),
  };
});

const service = require('../server/services/choreHistoryService');
const controller = require('../server/controllers/choreHistoryController');
const { getMonthRange } = require('../server/utils/choreHistoryValidation');

const USER = '11111111-1111-1111-1111-111111111111';
const HOUSE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RECORD = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function request(query = {}) {
  return {
    user: { id: USER },
    params: {
      householdId: HOUSE.toUpperCase(),
      choreId: RECORD.toUpperCase(),
      instanceId: RECORD.toUpperCase(),
    },
    query,
  };
}

function response() {
  const result = {};
  result.status = jest.fn().mockReturnValue(result);
  result.json = jest.fn().mockReturnValue(result);
  return result;
}

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('completion passes normalized IDs and returns the service result', async () => {
  const result = { instance: { id: RECORD, status: 'completed' } };
  service.completeChoreInstance.mockResolvedValue(result);
  const res = response();

  await controller.completeChoreInstance(request(), res);

  expect(service.completeChoreInstance).toHaveBeenCalledWith(
    USER,
    HOUSE,
    RECORD,
  );
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(result);
});

test('history passes explicit pagination and returns empty results', async () => {
  const result = { history: [], limit: 10, offset: 20 };
  service.getChoreHistory.mockResolvedValue(result);
  const res = response();

  await controller.getChoreHistory(request({ limit: '10', offset: '20' }), res);

  expect(service.getChoreHistory).toHaveBeenCalledWith(USER, HOUSE, RECORD, {
    limit: 10,
    offset: 20,
  });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(result);
});

test('history uses default pagination', async () => {
  service.getChoreHistory.mockResolvedValue({ history: [] });
  const res = response();

  await controller.getChoreHistory(request(), res);

  expect(service.getChoreHistory).toHaveBeenCalledWith(USER, HOUSE, RECORD, {
    limit: 50,
    offset: 0,
  });
});

test('statistics passes the UTC month range', async () => {
  const result = { month: '2026-10', members: [] };
  service.getMonthlyStatistics.mockResolvedValue(result);
  const res = response();

  await controller.getMonthlyStatistics(request({ month: '2026-10' }), res);

  expect(service.getMonthlyStatistics).toHaveBeenCalledWith(
    USER,
    HOUSE,
    getMonthRange('2026-10'),
  );
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(result);
});

test.each([
  ['getChoreHistory', { limit: '101' }],
  ['getChoreHistory', { offset: '-1' }],
  ['getMonthlyStatistics', {}],
  ['getMonthlyStatistics', { month: '2026-13' }],
])('%s rejects invalid query %j before the service', async (method, query) => {
  const res = response();

  await controller[method](request(query), res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    error: expect.any(String),
  });
  expect(service[method]).not.toHaveBeenCalled();
});

test.each([
  ['completeChoreInstance', 401],
  ['completeChoreInstance', 403],
  ['completeChoreInstance', 404],
  ['completeChoreInstance', 409],
  ['getChoreHistory', 403],
  ['getChoreHistory', 404],
  ['getMonthlyStatistics', 403],
])('%s preserves service status %s', async (method, status) => {
  service[method].mockRejectedValue(
    new service.ChoreHistoryServiceError(status, 'Request denied.'),
  );
  const res = response();

  await controller[method](request({ month: '2026-10' }), res);

  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({ error: 'Request denied.' });
});

test.each(['completeChoreInstance', 'getChoreHistory', 'getMonthlyStatistics'])(
  '%s hides unexpected database errors',
  async (method) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    service[method].mockRejectedValue(
      new Error('Private connection information'),
    );
    const res = response();

    await controller[method](request({ month: '2026-10' }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unable to process chore history.',
    });
  },
);
