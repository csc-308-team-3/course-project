const {
  getMonthRange,
  getHistoryPagination,
} = require('../server/utils/choreHistoryValidation');

test('uses UTC boundaries for a requested month', () => {
  expect(getMonthRange('2026-10')).toEqual({
    month: '2026-10',
    start: '2026-10-01T00:00:00.000Z',
    endExclusive: '2026-11-01T00:00:00.000Z',
  });
});

test('handles the December-to-January boundary', () => {
  expect(getMonthRange('2026-12').endExclusive).toBe(
    '2027-01-01T00:00:00.000Z',
  );
});

test.each([
  undefined,
  '2026-00',
  '2026-13',
  '2026-1',
  '2026-10-01',
  '0000-01',
  '9999-12',
  ['2026-10'],
])('rejects invalid month %j', (month) => {
  expect(() => getMonthRange(month)).toThrow();
});

test('uses bounded default pagination', () => {
  expect(getHistoryPagination({})).toEqual({
    limit: 50,
    offset: 0,
  });
});

test('accepts explicit pagination', () => {
  expect(getHistoryPagination({ limit: '20', offset: '40' })).toEqual({
    limit: 20,
    offset: 40,
  });
});

test.each([
  { limit: '0' },
  { limit: '101' },
  { limit: '1.5' },
  { limit: ['10'] },
  { offset: '-1' },
  { offset: '2147483648' },
])('rejects invalid pagination %j', (query) => {
  expect(() => getHistoryPagination(query)).toThrow();
});
