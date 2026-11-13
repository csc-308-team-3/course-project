const { isOverdue, findOverdueInstances } = require('../server/utils/overdue');

// Fixed "current time" so the tests never depend on the real clock.
const now = new Date('2026-11-04T12:00:00Z');
// A chore that was due yesterday morning and isn't finished.
const base = { due_date: '2026-11-03', due_time: '09:00:00', status: 'due' };

describe('isOverdue', () => {
  // The main case: due date has passed and the chore isn't done.
  test('past-due incomplete chore is overdue', () => {
    expect(isOverdue(base, now)).toBe(true);
  });

  // Finished chores must never land on the Board of Shame, whether they
  // are marked by status or only by a completed_at timestamp.
  test('completed chore is never overdue', () => {
    expect(isOverdue({ ...base, status: 'complete' }, now)).toBe(false);
    expect(
      isOverdue({ ...base, completed_at: '2026-11-03T08:00:00Z' }, now),
    ).toBe(false);
  });

  // A chore due later isn't overdue yet, and bad data shouldn't be
  // flagged or crash the check.
  test('future chore and malformed dates are not overdue', () => {
    expect(isOverdue({ ...base, due_date: '2026-11-05' }, now)).toBe(false);
    expect(isOverdue({ ...base, due_date: 'nope' }, now)).toBe(false);
  });
});

describe('findOverdueInstances', () => {
  // The list version keeps only the overdue rows and drops the rest.
  test('returns only the overdue instances', () => {
    const future = { ...base, due_date: '2026-11-10' };

    expect(findOverdueInstances([base, future], now)).toEqual([base]);
  });
});