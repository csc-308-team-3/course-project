jest.mock('../server/services/choreService', () => {
  const actual = jest.requireActual('../server/services/choreService');

  return {
    ...actual,
    createChore: jest.fn(),
  };
});

const express = require('express');
const { once } = require('node:events');
const choreService = require('../server/services/choreService');
const householdRoutes = require('../server/routes/householdRoutes');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333';

const body = {
  title: 'Wash dishes',
  category: 'Kitchen',
  instructions: 'Wash and put away the dishes.',
  assigneeId: ASSIGNEE_ID,
  dueDate: '2026-10-26',
  recurrenceFrequency: 'one-time',
  recurrenceStartDate: null,
  estimatedDuration: 15,
  dueTime: '18:30',
};

let server;
let baseUrl;
let authenticatedUser;

beforeEach(async () => {
  jest.resetAllMocks();
  authenticatedUser = null;

  const app = express();
  app.use(express.json());

  // Test-only substitute for session authentication.
  app.use((request, response, next) => {
    if (authenticatedUser) {
      request.user = authenticatedUser;
    }

    next();
  });

  app.use('/api/households', householdRoutes);

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

function postChore(householdId = HOUSEHOLD_ID, payload = body) {
  return fetch(`${baseUrl}/api/households/${householdId}/chores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

test('rejects unauthenticated requests with 401', async () => {
  const response = await postChore();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    error: 'Authentication is required.',
  });
  expect(choreService.createChore).not.toHaveBeenCalled();
});

test('rejects an invalid household ID before reaching the service', async () => {
  authenticatedUser = { id: USER_ID };

  const response = await postChore('not-a-uuid');

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: 'A valid household ID is required.',
  });
  expect(choreService.createChore).not.toHaveBeenCalled();
});

test('returns 201 for a valid authenticated creation request', async () => {
  authenticatedUser = { id: USER_ID };
  const result = {
    chore: { id: 'created-chore', householdId: HOUSEHOLD_ID },
    instance: { id: 'created-instance' },
  };
  choreService.createChore.mockResolvedValue(result);

  const response = await postChore();

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual(result);
  expect(choreService.createChore).toHaveBeenCalledWith(
    USER_ID,
    HOUSEHOLD_ID,
    body,
  );
});

test('returns validation errors through the HTTP endpoint', async () => {
  authenticatedUser = { id: USER_ID };

  const response = await postChore(HOUSEHOLD_ID, {
    ...body,
    title: '',
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: 'Invalid chore.',
    details: expect.arrayContaining(['title must be a non-empty string.']),
  });
  expect(choreService.createChore).not.toHaveBeenCalled();
});

test('returns 403 when the service rejects household membership', async () => {
  authenticatedUser = { id: USER_ID };
  choreService.createChore.mockRejectedValue(
    new choreService.ChoreServiceError(
      403,
      'You are not a member of this household.',
    ),
  );

  const response = await postChore();

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: 'You are not a member of this household.',
  });
});
