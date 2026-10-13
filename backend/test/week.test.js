const { getWeeklyRange } = require('../src/utils/week');

describe('getWeeklyRange', () => {
  test('returns the correct Monday-to-Sunday weekly range', () => {
    expect(getWeeklyRange('2026-10-12')).toEqual({
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      endExclusive: '2026-10-19',
    });
  });

  test('rejects a weekStart that is not a Monday', () => {
    expect(() => getWeeklyRange('2026-10-18')).toThrow(
      'weekStart must be a Monday.'
    );
  });

  test('rejects an invalid calendar date', () => {
    expect(() => getWeeklyRange('2026-02-30')).toThrow(
      'weekStart must use the YYYY-MM-DD format.'
    );
  });
});