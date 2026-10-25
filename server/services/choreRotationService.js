const validRecurrenceFrequencies = new Set([ // only allow these values for recurrence_frequency
  'daily',
  'weekly',
  'monthly',
]);

class ChoreRotationServiceError extends Error {
  constructor(status, message) { // custom error class for chore rotation service errors
    super(message);
    this.name = 'ChoreRotationServiceError';
    this.status = status;
  }
}

function createDate(value) { // converts a valid date string to a JavaScript Date object
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date) { // converts a JavaScript Date object to a valid date string 
  return date.toISOString().slice(0, 10);
}

function isValidDate(value) { // checks whether a value is a valid date string.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { // also checks for YYYY-MM-DD format
    return false;
  }

  const date = createDate(value); // converts to JavaScript Date object

  // checks if the date is valid and matches the original string
  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

function addDays(date, days) {
  const result = new Date(date); // stores original date
  result.setUTCDate(result.getUTCDate() + days); // adds the specified number of days
  return result; // returns the new date
}

function addMonths(date, months) { 
  const day = date.getUTCDate(); // stores the original day of the month
  const result = new Date( 
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1), // creates new month with day set to 1
  );
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0), // gets the last day of the new month
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfMonth)); // sets day to the smaller of original day or last day of month
  return result; // return the new date
}

function validateDateRange(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ChoreRotationServiceError( // throws error if either start or end date is invalid
      400,
      'startDate and endDate must use the YYYY-MM-DD format.',
    );
  }

  const start = createDate(startDate);
  const end = createDate(endDate);

  if (start > end) {
    throw new ChoreRotationServiceError( // throws error if start date is after end date
      400,
      'startDate must be on or before endDate.',
    );
  }

  return { start, end }; // return valid start and end dates
}

function getOccurrenceDates(frequency, recurrenceStartDate, startDate, endDate) {
  if (!validRecurrenceFrequencies.has(frequency)) {
    throw new ChoreRotationServiceError( // throws error if frequency is not valid
      400,
      'Recurrence frequency must be daily, weekly, or monthly.',
    );
  }

  const recurrenceStart = createDate(recurrenceStartDate);
  const occurrences = []; // array to hold occurrence dates
  let occurrenceNumber = 0; // counter for the number of occurrences
  let dueDate = recurrenceStart; // initializes dueDate to the recurrence start date

  while (dueDate <= endDate) { // loop until dueDate exceeds the end date
    if (dueDate >= startDate) { // only add occurrences that fall within the specified date range
      occurrences.push({ // add occurrence to the array
        dueDate: formatDate(dueDate), 
        occurrenceNumber,
      });
    }

    occurrenceNumber += 1; // increment that the chore has occurred one more time

    if (frequency === 'daily') { 
      // Calculate the date one day after the start date for each occurrence.
      dueDate = addDays(recurrenceStart, occurrenceNumber);
    } else if (frequency === 'weekly') {
      // Calculate the date 7 days after the start date for each occurrence.
      dueDate = addDays(recurrenceStart, occurrenceNumber * 7);
    } else {
      // Calculate the date one month after the start date for each occurrence.
      dueDate = addMonths(recurrenceStart, occurrenceNumber);
    }
  }

  return occurrences; // returns the array of occurrence dates
}

module.exports = { // exports the functions and error class for use in other files
  ChoreRotationServiceError,
  getOccurrenceDates,
  validateDateRange,
};