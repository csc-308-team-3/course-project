const {
  validateAnnouncement,
  validateWeekStart,
} = require('../server/utils/announcementValidation');

describe('weekly announcement validation', () => {
  test('accepts a Monday week start and trims a valid message', () => {
    expect(
      validateAnnouncement({
        weekStart: '2026-11-02',
        message: '  Help keep the kitchen clean this week!  ',
      }),
    ).toEqual({
      errors: [],
      value: {
        weekStart: '2026-11-02',
        message: 'Help keep the kitchen clean this week!',
      },
    });
  });

  test('rejects a date that is not a Monday', () => {
    expect(validateWeekStart('2026-11-03')).toBe(
      'weekStart must be a Monday.',
    );
  });

  test('rejects a date that does not exist', () => {
    expect(validateWeekStart('2026-02-30')).toBe(
      'weekStart must use the YYYY-MM-DD format.',
    );
  });

  test('rejects a blank announcement message', () => {
    expect(
      validateAnnouncement({
        weekStart: '2026-11-02',
        message: '   ',
      }),
    ).toEqual({
      errors: ['Announcement message is required.'],
      value: {
        weekStart: '2026-11-02',
        message: '',
      },
    });
  });

  test('rejects an announcement longer than 75 characters', () => {
    expect(
      validateAnnouncement({
        weekStart: '2026-11-02',
        message: 'a'.repeat(76),
      }).errors,
    ).toEqual(['Announcement message must be 75 characters or fewer.']);
  });
});