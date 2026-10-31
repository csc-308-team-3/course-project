jest.mock('../server/services/choreService', () => {
  const actual = jest.requireActual('../server/services/choreService');

  return {
    ...actual,
    createChore: jest.fn(),
  };
});

const choreService = require('../server/services/choreService');
const { createChore } = require('../server/controllers/choreController');

const USER_ID = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333';

function validBody() {
  return {
    title: 'Wash dishes',
    category: 'Kitchen',
    instructions: 'Wash and put away the dishes.',
    assigneeId: ASSIGNEE_ID,
    dueDate: '2026-10-26',
    recurrenceFrequency: 'one-time',
    recurrenceStartDate: null,
  };
}

function createRequest(body = validBody()) {
  return {
    user: { id: USER_ID },
    params: { householdId: HOUSEHOLD_ID },
    body,
  };
}

function createResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('returns 201 and passes normalized input to the service', async () => {
  const body = {
    ...validBody(),
    title: '  Wash dishes  ',
    category: '  Kitchen  ',
    instructions: '  Wash and put away the dishes.  ',
  };
  const result = {
    chore: { id: 'created-chore', title: 'Wash dishes' },
    instance: { id: 'created-instance' },
  };
  choreService.createChore.mockResolvedValue(result);
  const response = createResponse();

  await createChore(createRequest(body), response);

  expect(choreService.createChore).toHaveBeenCalledWith(
    USER_ID,
    HOUSEHOLD_ID,
    validBody(),
  );
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith(result);
});

test.each(['daily', 'weekly', 'monthly'])(
  'accepts a valid %s recurring chore',
  async (frequency) => {
    const body = {
      ...validBody(),
      recurrenceFrequency: frequency,
      recurrenceStartDate: '2026-10-26',
    };
    choreService.createChore.mockResolvedValue({ chore: body });
    const response = createResponse();

    await createChore(createRequest(body), response);

    expect(choreService.createChore).toHaveBeenCalledWith(
      USER_ID,
      HOUSEHOLD_ID,
      body,
    );
    expect(response.status).toHaveBeenCalledWith(201);
  },
);

test.each([
  ['missing title', { title: undefined }],
  ['blank title', { title: '   ' }],
  ['missing category', { category: undefined }],
  ['missing instructions', { instructions: undefined }],
  ['missing assignee', { assigneeId: undefined }],
  ['invalid assignee', { assigneeId: 'not-a-uuid' }],
  ['missing due date', { dueDate: undefined }],
  ['impossible date', { dueDate: '2026-02-30' }],
  ['unsupported frequency', { recurrenceFrequency: 'yearly' }],
  [
    'missing recurrence start date',
    { recurrenceFrequency: 'weekly', recurrenceStartDate: null },
  ],
  [
    'mismatched first due date',
    {
      recurrenceFrequency: 'weekly',
      recurrenceStartDate: '2026-10-27',
    },
  ],
  [
    'recurrence date on a one-time chore',
    { recurrenceStartDate: '2026-10-26' },
  ],
])('rejects %s before calling the service', async (_label, changes) => {
  const response = createResponse();

  await createChore(
    createRequest({ ...validBody(), ...changes }),
    response,
  );

  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith({
    error: 'Invalid chore.',
    details: expect.arrayContaining([expect.any(String)]),
  });
  expect(choreService.createChore).not.toHaveBeenCalled();
});

test('rejects a missing request body', async () => {
  const request = createRequest();
  request.body = undefined;
  const response = createResponse();

  await createChore(request, response);

  expect(response.status).toHaveBeenCalledWith(400);
  expect(choreService.createChore).not.toHaveBeenCalled();
});

test.each([
  [401, 'Authentication is required.'],
  [403, 'You are not a member of this household.'],
  [400, 'The assigned roommate must belong to this household.'],
])('preserves service error status %s', async (status, message) => {
  choreService.createChore.mockRejectedValue(
    new choreService.ChoreServiceError(status, message),
  );
  const response = createResponse();

  await createChore(createRequest(), response);

  expect(response.status).toHaveBeenCalledWith(status);
  expect(response.json).toHaveBeenCalledWith({ error: message });
});

test('returns a generic 500 response for unexpected failures', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  choreService.createChore.mockRejectedValue(
    new Error('Private database details'),
  );
  const response = createResponse();

  await createChore(createRequest(), response);

  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    error: 'Unable to create chore.',
  });
});