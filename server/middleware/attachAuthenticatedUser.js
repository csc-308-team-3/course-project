const { getPool } = require('../db');

async function attachAuthenticatedUser(request, response, next) {
  if (!request.session?.userId) {
    return next();
  }

  try {
    const result = await getPool().query(
      'SELECT id, household_id AS "householdId" FROM users WHERE id = $1',
      [request.session.userId],
    );

    if (result.rows[0]) {
      request.user = result.rows[0];
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { attachAuthenticatedUser };
