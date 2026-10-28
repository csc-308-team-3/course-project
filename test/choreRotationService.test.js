const {
  getOccurrenceDates,
  validateDateRange,
} = require('../server/services/choreRotationService');

describe('getOccurrenceDates', () => {

  // getOccurrenceDates tests

  test('creates daily occurrences within the selected date range', () => {
    expect(
      getOccurrenceDates(
        'daily',
        '2026-10-12',
        new Date('2026-10-12T00:00:00.000Z'),
        new Date('2026-10-14T00:00:00.000Z'),
      ),
    ).toEqual([
      { dueDate: '2026-10-12', occurrenceNumber: 0 },
      { dueDate: '2026-10-13', occurrenceNumber: 1 },
      { dueDate: '2026-10-14', occurrenceNumber: 2 }, // 3 days total
    ]);
  });

    test('creates weekly occurrences and keeps the correct rotation number', () => {
    expect(
      getOccurrenceDates(
        'weekly',
        '2026-10-05', // start date is a week before the range
        new Date('2026-10-12T00:00:00.000Z'),
        new Date('2026-10-25T00:00:00.000Z'),
      ),
    ).toEqual([ // should output 2nd and 3rd occurences of the chore
      { dueDate: '2026-10-12', occurrenceNumber: 1 },
      { dueDate: '2026-10-19', occurrenceNumber: 2 },
    ]);
  });

  test('handles monthly chores when a later month has fewer days', () => {
    expect(
      getOccurrenceDates(
        'monthly',
        '2026-01-31',
        new Date('2026-01-31T00:00:00.000Z'),
        new Date('2026-03-31T00:00:00.000Z'),
      ),
    ).toEqual([ // should output 3 occurrences of the chore, with February having only 28 days
      { dueDate: '2026-01-31', occurrenceNumber: 0 },
      { dueDate: '2026-02-28', occurrenceNumber: 1 },
      { dueDate: '2026-03-31', occurrenceNumber: 2 },
    ]);
  });

  // validateDateRange tests

  test('rejects an unsupported recurrence frequency', () => {
    expect(() =>
      getOccurrenceDates(
        'yearly', // yearly does not exist
        '2026-10-12',
        new Date('2026-10-12T00:00:00.000Z'),
        new Date('2026-10-18T00:00:00.000Z'),
      ),
    ).toThrow('Recurrence frequency must be daily, weekly, or monthly.');
  });

  test('rejects a date that does not really exist', () => {
    expect(() =>
      validateDateRange('2026-02-30', '2026-03-01'), // February 30th is not a valid date
    ).toThrow('startDate and endDate must use the YYYY-MM-DD format.');
  });

  test('rejects a range where the start date is after the end date', () => {
    expect(() =>
      validateDateRange('2026-10-19', '2026-10-12'),
    ).toThrow('startDate must be on or before endDate.');
  });
});