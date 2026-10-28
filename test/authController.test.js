const { expect, test } = require('@jest/globals');
const {
  createAuthController,
} = require('../server/controllers/authController');

function createResponse() {
  return {
    body: undefined,
    clearedCookie: undefined,
    ended: false,
    statusCode: undefined,
    clearCookie(name) {
      this.clearedCookie = name;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

function createRequest({ body = {}, session = {} } = {}) {
  return {
    body,
    session: {
      destroy(callback) {
        callback();
      },
      regenerate(callback) {
        callback();
      },
      save(callback) {
        callback();
      },
      ...session,
    },
  };
}

test('registers a user and creates a session', async () => {
  const calls = [];
  const controller = createAuthController({
    async createUser(details) {
      calls.push(details);
      return {
        email: details.email,
        householdId: null,
        id: 'user-1',
        name: details.name,
        score: 0,
      };
    },
  });
  const request = createRequest({
    body: {
      email: '  TEST@EXAMPLE.COM ',
      name: ' Test User ',
      password: 'password123',
    },
  });
  const response = createResponse();

  await controller.register(request, response);

  expect(calls).toEqual([
    { email: 'test@example.com', name: 'Test User', password: 'password123' },
  ]);
  expect(request.session.userId).toBe('user-1');
  expect(response.statusCode).toBe(201);
  expect(response.body.user.passwordHash).toBeUndefined();
  expect(response.body.user.email).toBe('test@example.com');
});

test('rejects invalid registration input before creating a user', async () => {
  let createUserCalled = false;
  const controller = createAuthController({
    async createUser() {
      createUserCalled = true;
    },
  });
  const response = createResponse();

  await controller.register(
    createRequest({
      body: { email: 'not-an-email', name: '', password: 'short' },
    }),
    response,
  );

  expect(createUserCalled).toBe(false);
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toMatch(/name/i);
});

test('rejects duplicate registration emails', async () => {
  const controller = createAuthController({
    async createUser() {
      const error = new Error('duplicate email');
      error.code = '23505';
      throw error;
    },
  });
  const response = createResponse();

  await controller.register(
    createRequest({
      body: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      },
    }),
    response,
  );

  expect(response.statusCode).toBe(409);
  expect(response.body.message).toMatch(/already exists/i);
});

test('logs in a user and creates a session', async () => {
  const controller = createAuthController({
    async authenticateUser() {
      return {
        email: 'test@example.com',
        householdId: null,
        id: 'user-1',
        name: 'Test User',
        score: 0,
      };
    },
  });
  const request = createRequest({
    body: { email: 'test@example.com', password: 'password123' },
  });
  const response = createResponse();

  await controller.login(request, response);

  expect(response.statusCode).toBe(200);
  expect(request.session.userId).toBe('user-1');
});

test('does not reveal whether an invalid login email exists', async () => {
  const controller = createAuthController({
    async authenticateUser() {
      return null;
    },
  });
  const response = createResponse();

  await controller.login(
    createRequest({
      body: { email: 'missing@example.com', password: 'password123' },
    }),
    response,
  );

  expect(response.statusCode).toBe(401);
  expect(response.body.message).toBe('Invalid email or password.');
});

test('logs in with Google and creates a session', async () => {
  const controller = createAuthController({
    async authenticateGoogleUser(credential) {
      expect(credential).toBe('google-id-token');
      return {
        email: 'test@example.com',
        householdId: null,
        id: 'user-1',
        name: 'Test User',
        score: 0,
      };
    },
  });
  const request = createRequest({ body: { credential: 'google-id-token' } });
  const response = createResponse();

  await controller.loginWithGoogle(request, response);

  expect(response.statusCode).toBe(200);
  expect(request.session.userId).toBe('user-1');
});

test('rejects a Google sign-in without a credential', async () => {
  const controller = createAuthController();
  const response = createResponse();

  await controller.loginWithGoogle(createRequest(), response);

  expect(response.statusCode).toBe(400);
  expect(response.body.message).toMatch(/credential/i);
});

test('reports a conflict for an unlinked email account', async () => {
  const controller = createAuthController({
    async authenticateGoogleUser() {
      const error = new Error('existing account');
      error.code = 'GOOGLE_ACCOUNT_CONFLICT';
      throw error;
    },
  });
  const response = createResponse();

  await controller.loginWithGoogle(
    createRequest({ body: { credential: 'google-id-token' } }),
    response,
  );

  expect(response.statusCode).toBe(409);
  expect(response.body.message).toMatch(/password/i);
});

test('reports an unauthenticated session without looking up a user', async () => {
  let getUserByIdCalled = false;
  const controller = createAuthController({
    async getUserById() {
      getUserByIdCalled = true;
    },
  });
  const response = createResponse();

  await controller.getSession(createRequest(), response);

  expect(getUserByIdCalled).toBe(false);
  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ authenticated: false, user: null });
});

test('ends the session and clears the session cookie on logout', () => {
  const controller = createAuthController();
  const request = createRequest({ session: { userId: 'user-1' } });
  const response = createResponse();

  controller.logout(request, response);

  expect(response.statusCode).toBe(204);
  expect(response.clearedCookie).toBe('choremate.sid');
  expect(response.ended).toBe(true);
});
