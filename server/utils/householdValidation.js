function normalizeInviteCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function isValidUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function validateCreateHousehold(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  return name
    ? { errors: [], value: { name } }
    : {
        errors: ['name is required and must be a non-empty string.'],
        value: {},
      };
}

module.exports = {
  isValidUuid,
  normalizeInviteCode,
  validateCreateHousehold,
};
