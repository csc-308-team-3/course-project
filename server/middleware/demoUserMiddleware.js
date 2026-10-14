const { getPool } = require('../db');

async function attachDemoUser(request, response, next) {
  if (process.env.NODE_ENV === 'production' || !process.env.DEMO_USER_ID) {
    return next();
  }

  try {
    const result = await getPool().query(
      'SELECT id, household_id AS "householdId" FROM users WHERE id = $1',
      [process.env.DEMO_USER_ID],
    );

    if (result.rows.length > 0) {
      request.user = result.rows[0];
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { attachDemoUser };
