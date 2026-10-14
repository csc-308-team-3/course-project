/* global describe, test, expect */
const {
  isValidUuid,
  validateCreateChore,
  validateUpdateChore,
} = require('../utils/choreValidation');

const assigneeId = '22222222-2222-2222-2222-222222222222';

function validChore(overrides = {}) {
  return {
    title: 'Wash dishes',
    category: 'Kitchen',
    instructions: 'Dry rack, then cabinets.',
    assigneeId,
    dueDate: '2026-10-14',
    dueTime: '18:30',
    ...overrides,
  };
}

describe('validateCreateChore', () => {
  test('accepts a complete chore and trims text fields', () => {
    const { errors, value } = validateCreateChore(
      validChore({ title: '  Wash dishes  ', category: ' Kitchen ' }),
    );

    expect(errors).toEqual([]);
    expect(value).toEqual(
      validChore({ title: 'Wash dishes', category: 'Kitchen' }),
    );
  });

  test('accepts a chore with only the required fields', () => {
    const { errors, value } = validateCreateChore({
      title: 'Take out trash',
      category: 'Cleaning',
      assigneeId,
    });

    expect(errors).toEqual([]);
    expect(value).toEqual({
      title: 'Take out trash',
      category: 'Cleaning',
      assigneeId,
    });
  });

  test.each([null, undefined, 'text', 7, []])(
    'rejects a body that is not an object (%p)',
    (body) => {
      expect(validateCreateChore(body).errors).toEqual([
        'Request body must be a JSON object.',
      ]);
    },
  );

  test.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
    ['not a string', 42],
    ['too long', 'x'.repeat(101)],
  ])('rejects a %s title', (_label, title) => {
    const chore = validChore();
    if (title === undefined) {
      delete chore.title;
    } else {
      chore.title = title;
    }

    expect(validateCreateChore(chore).errors).toHaveLength(1);
    expect(validateCreateChore(chore).errors[0]).toMatch(/^title/);
  });

  test('accepts a title at the maximum length', () => {
    expect(
      validateCreateChore(validChore({ title: 'x'.repeat(100) })).errors,
    ).toEqual([]);
  });

  test.each([
    ['missing', undefined],
    ['blank', ' '],
    ['too long', 'x'.repeat(51)],
  ])('rejects a %s category', (_label, category) => {
    const chore = validChore();
    if (category === undefined) {
      delete chore.category;
    } else {
      chore.category = category;
    }

    expect(validateCreateChore(chore).errors[0]).toMatch(/^category/);
  });

  test('requires a valid assigneeId', () => {
    const missing = validChore();
    delete missing.assigneeId;

    expect(validateCreateChore(missing).errors).toEqual([
      'assigneeId is required.',
    ]);
    expect(
      validateCreateChore(validChore({ assigneeId: 'not-a-uuid' })).errors,
    ).toEqual(['assigneeId must be a valid user ID.']);
  });

  test('rejects instructions that are not text or are too long', () => {
    expect(
      validateCreateChore(validChore({ instructions: 12 })).errors[0],
    ).toMatch(/^instructions/);
    expect(
      validateCreateChore(validChore({ instructions: 'x'.repeat(2001) }))
        .errors[0],
    ).toMatch(/^instructions/);
  });

  test('allows null instructions and stores blank instructions as null', () => {
    expect(
      validateCreateChore(validChore({ instructions: null })).value
        .instructions,
    ).toBeNull();
    expect(
      validateCreateChore(validChore({ instructions: '   ' })).value
        .instructions,
    ).toBeNull();
  });

  test.each([
    '2026-13-01',
    '2026-02-30',
    '10/14/2026',
    '2026-10-14T10:00:00Z',
    20261014,
  ])('rejects the invalid due date %p', (dueDate) => {
    expect(validateCreateChore(validChore({ dueDate })).errors[0]).toMatch(
      /^dueDate/,
    );
  });

  test.each(['24:00', '12:60', '9:30', '18:30:00', 'noon', 1830])(
    'rejects the invalid due time %p',
    (dueTime) => {
      expect(validateCreateChore(validChore({ dueTime })).errors[0]).toMatch(
        /^dueTime/,
      );
    },
  );

  test('accepts the boundary times 00:00 and 23:59', () => {
    expect(
      validateCreateChore(validChore({ dueTime: '00:00' })).errors,
    ).toEqual([]);
    expect(
      validateCreateChore(validChore({ dueTime: '23:59' })).errors,
    ).toEqual([]);
  });

  test('rejects a due time without a due date', () => {
    const chore = validChore();
    delete chore.dueDate;

    expect(validateCreateChore(chore).errors).toEqual([
      'dueTime cannot be set without a dueDate.',
    ]);
    expect(validateCreateChore(validChore({ dueDate: null })).errors).toEqual([
      'dueTime cannot be set without a dueDate.',
    ]);
  });

  test('rejects an unknown status and accepts every known one', () => {
    expect(
      validateCreateChore(validChore({ status: 'done' })).errors[0],
    ).toMatch(/^status/);

    ['todo', 'due', 'complete'].forEach((status) => {
      expect(validateCreateChore(validChore({ status })).errors).toEqual([]);
    });
  });

  test('reports every problem at once', () => {
    const { errors } = validateCreateChore({ title: '', dueDate: 'soon' });

    expect(errors).toHaveLength(4);
  });
});

describe('validateUpdateChore', () => {
  test('only validates the fields that are present', () => {
    const { errors, value } = validateUpdateChore({ title: ' New title ' });

    expect(errors).toEqual([]);
    expect(value).toEqual({ title: 'New title' });
  });

  test('rejects an empty update', () => {
    expect(validateUpdateChore({}).errors).toEqual([
      'Provide at least one field to update.',
    ]);
  });

  test('can clear the optional fields with null', () => {
    const { errors, value } = validateUpdateChore({
      dueDate: null,
      dueTime: null,
      instructions: null,
    });

    expect(errors).toEqual([]);
    expect(value).toEqual({
      dueDate: null,
      dueTime: null,
      instructions: null,
    });
  });

  test('does not let a required field be blanked out', () => {
    expect(validateUpdateChore({ title: '' }).errors[0]).toMatch(/^title/);
    expect(validateUpdateChore({ category: null }).errors[0]).toMatch(
      /^category/,
    );
  });

  test('validates a reassignment and a status change', () => {
    expect(validateUpdateChore({ assigneeId: 'nope' }).errors[0]).toMatch(
      /^assigneeId/,
    );
    expect(validateUpdateChore({ status: 'finished' }).errors[0]).toMatch(
      /^status/,
    );
    expect(validateUpdateChore({ status: 'complete' }).value).toEqual({
      status: 'complete',
    });
  });

  test('ignores unknown fields such as householdId', () => {
    const { errors, value } = validateUpdateChore({
      title: 'Mop',
      householdId: '99999999-9999-9999-9999-999999999999',
    });

    expect(errors).toEqual([]);
    expect(value).toEqual({ title: 'Mop' });
  });
});

describe('isValidUuid', () => {
  test('accepts UUIDs and rejects everything else', () => {
    expect(isValidUuid(assigneeId)).toBe(true);
    expect(isValidUuid('22222222-2222-2222-2222-22222222222')).toBe(false);
    expect(isValidUuid("1'; DROP TABLE chores;--")).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid(123)).toBe(false);
  });
});
