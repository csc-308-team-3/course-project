const {
  authenticateUser,
  createUser,
  getUserById,
} = require('../services/authService');

function validateCredentials({ name, email, password }, requiresName) {
  if (
    requiresName &&
    (!name || name.trim().length < 1 || name.trim().length > 100)
  ) {
    return 'Name must be between 1 and 100 characters.';
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return 'Enter a valid email address.';
  }

  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

function saveSession(request) {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function createAuthController(authService = {}) {
  const createAccount = authService.createUser ?? createUser;
  const verifyCredentials = authService.authenticateUser ?? authenticateUser;
  const findUserById = authService.getUserById ?? getUserById;

  async function register(request, response) {
    const name = request.body?.name?.trim();
    const email = request.body?.email?.trim().toLowerCase();
    const { password } = request.body ?? {};
    const validationError = validateCredentials(
      { name, email, password },
      true,
    );

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    try {
      const user = await createAccount({ name, email, password });
      await regenerateSession(request);
      request.session.userId = user.id;
      await saveSession(request);
      return response.status(201).json({ user });
    } catch (error) {
      if (error.code === '23505') {
        return response
          .status(409)
          .json({ message: 'An account with that email already exists.' });
      }

      console.error('Registration failed.', { code: error.code });
      return response
        .status(500)
        .json({ message: 'Unable to create the account.' });
    }
  }

  async function login(request, response) {
    const email = request.body?.email?.trim().toLowerCase();
    const { password } = request.body ?? {};
    const validationError = validateCredentials({ email, password }, false);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    try {
      const user = await verifyCredentials({ email, password });

      if (!user) {
        return response
          .status(401)
          .json({ message: 'Invalid email or password.' });
      }

      await regenerateSession(request);
      request.session.userId = user.id;
      await saveSession(request);
      return response.status(200).json({ user });
    } catch (error) {
      console.error('Login failed.', { code: error.code });
      return response.status(500).json({ message: 'Unable to log in.' });
    }
  }

  function logout(request, response) {
    request.session.destroy((error) => {
      if (error) {
        console.error('Logout failed.', { code: error.code });
        return response.status(500).json({ message: 'Unable to log out.' });
      }

      response.clearCookie('choremate.sid');
      return response.status(204).end();
    });
  }

  async function getSession(request, response) {
    if (!request.session.userId) {
      return response.status(200).json({ authenticated: false, user: null });
    }

    try {
      const user = await findUserById(request.session.userId);

      if (!user) {
        request.session.destroy(() => {});
        return response.status(200).json({ authenticated: false, user: null });
      }

      return response.status(200).json({ authenticated: true, user });
    } catch (error) {
      console.error('Session lookup failed.', { code: error.code });
      return response
        .status(500)
        .json({ message: 'Unable to check the session.' });
    }
  }

  return { getSession, login, logout, register };
}

module.exports = { ...createAuthController(), createAuthController };
