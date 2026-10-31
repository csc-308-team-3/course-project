jest.mock('../server/services/choreHistoryService', () => {
  const actual = jest.requireActual('../server/services/choreHistoryService');

  return {
    ...actual,
    completeChoreInstance: jest.fn(),
    getChoreHistory: jest.fn(),
    getMonthlyStatistics: jest.fn(),
  };
});

const express = require('express');
const { once } = require('node:events');
const service = require('../server/services/choreHistoryService');
const router = require('../server/routes/choreHistoryRoutes');
const { getMonthRange } = require('../server/utils/choreHistoryValidation');

const USER = '11111111-1111-1111-1111-111111111111';
const HOUSE = '22222222-2222-2222-2222-222222222222';
const RECORD = '33333333-3333-3333-3333-333333333333';

let server;
let baseUrl;
let authenticatedUser;

beforeEach(async () => {
  jest.resetAllMocks();
  authenticatedUser = null;

  const app = express();
  app.use(express.json());

  // test only authentication substitute
  app.use((request, response, next) => {
    if (authenticatedUser) request.user = authenticatedUser;
    next();
  });

  app.use('/api/households', router);

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
      server.closeAllConnections();
    });
  }
});

function send(method, path) {
  return fetch(`${baseUrl}/api/households${path}`, { method });
}

const endpoints = [
  ['POST', `/${HOUSE}/chore-instances/${RECORD}/complete`],
  ['GET', `/${HOUSE}/chores/${RECORD}/history`],
  ['GET', `/${HOUSE}/chore-statistics?month=2026-10`],
];

function expectNoServiceCalls() {
  expect(service.completeChoreInstance).not.toHaveBeenCalled();
  expect(service.getChoreHistory).not.toHaveBeenCalled();
  expect(service.getMonthlyStatistics).not.toHaveBeenCalled();
}

test.each(endpoints)('%s %s requires authentication', async (method, path) => {
  const res = await send(method, path);

  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({
    error: 'Authentication is required.',
  });
  expectNoServiceCalls();
});

test.each(endpoints)(
  '%s %s validates the household ID',
  async (method, path) => {
    authenticatedUser = { id: USER };

    const res = await send(method, path.replace(HOUSE, 'invalid'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'A valid household ID is required.',
    });
    expectNoServiceCalls();
  },
);

test.each([
  ['POST', `/${HOUSE}/chore-instances/invalid/complete`, 'instanceId'],
  ['GET', `/${HOUSE}/chores/invalid/history`, 'choreId'],
])('%s %s validates the record ID', async (method, path, parameter) => {
  authenticatedUser = { id: USER };

  const res = await send(method, path);

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({
    error: `${parameter} must be a valid UUID.`,
  });
  expectNoServiceCalls();
});

test('completion works without a request body', async () => {
  authenticatedUser = { id: USER };
  const result = { instance: { id: RECORD, status: 'completed' } };
  service.completeChoreInstance.mockResolvedValue(result);

  const res = await send(
    'POST',
    `/${HOUSE}/chore-instances/${RECORD}/complete`,
  );

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(result);
  expect(service.completeChoreInstance).toHaveBeenCalledWith(
    USER,
    HOUSE,
    RECORD,
  );
});

test('history parses pagination from HTTP query parameters', async () => {
  authenticatedUser = { id: USER };
  const result = { history: [], limit: 10, offset: 20 };
  service.getChoreHistory.mockResolvedValue(result);

  const res = await send(
    'GET',
    `/${HOUSE}/chores/${RECORD}/history?limit=10&offset=20`,
  );

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(result);
  expect(service.getChoreHistory).toHaveBeenCalledWith(USER, HOUSE, RECORD, {
    limit: 10,
    offset: 20,
  });
});

test('statistics parses the month from the HTTP request', async () => {
  authenticatedUser = { id: USER };
  const result = { month: '2026-10', members: [] };
  service.getMonthlyStatistics.mockResolvedValue(result);

  const res = await send('GET', `/${HOUSE}/chore-statistics?month=2026-10`);

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(result);
  expect(service.getMonthlyStatistics).toHaveBeenCalledWith(
    USER,
    HOUSE,
    getMonthRange('2026-10'),
  );
});

test.each([
  `/${HOUSE}/chore-statistics`,
  `/${HOUSE}/chore-statistics?month=2026-13`,
  `/${HOUSE}/chores/${RECORD}/history?limit=101`,
  `/${HOUSE}/chores/${RECORD}/history?offset=-1`,
])('rejects invalid query: %s', async (path) => {
  authenticatedUser = { id: USER };

  const res = await send('GET', path);

  expect(res.status).toBe(400);
  await res.json();
  expectNoServiceCalls();
});

test('returns household authorization errors through HTTP', async () => {
  authenticatedUser = { id: USER };
  service.getMonthlyStatistics.mockRejectedValue(
    new service.ChoreHistoryServiceError(
      403,
      'You are not a member of this household.',
    ),
  );

  const res = await send('GET', `/${HOUSE}/chore-statistics?month=2026-10`);

  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({
    error: 'You are not a member of this household.',
  });
});
