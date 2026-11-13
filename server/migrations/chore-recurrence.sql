-- Keep each chore's category separate from how often it repeats.
-- We used recurrence_frequency for categories earlier, so this moves
-- those old values into their own category column.

BEGIN; -- start database transaction

-- Add a category column for labels such as Kitchen, Shopping, and Technology.
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS category text; -- only if it doesn't already exist so no error from postgresSQL

-- Copy the old category value before changing recurrence_frequency.
UPDATE chores
SET category = recurrence_frequency -- move old values of recurrence_frequency into category
WHERE category IS NULL
  AND recurrence_frequency IS NOT NULL -- only update chores that don't have a category yet
  AND recurrence_frequency NOT IN ( -- only copy valid category values, not recurrence frequencies
    'one-time',
    'daily',
    'weekly',
    'monthly'
  );

-- after category and recurrence_frequency each have their correct values:

-- Existing chores do not have a repeat schedule yet,
-- so treat them as one-time chores for now.
UPDATE chores
SET recurrence_frequency = 'one-time' -- set all chores to one-time bc these are test chores before
WHERE recurrence_frequency IS NULL -- only update chores that don't have a recurrence_frequency yet
  OR recurrence_frequency NOT IN ( -- only update chores that don't have a valid recurrence_frequency
    'one-time',
    'daily',
    'weekly',
    'monthly'
  );

-- Future recurring chores need a starting date so the app knows
-- when to begin generating daily, weekly, or monthly.
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS recurrence_start_date date; -- only if it doesn't already exist so no error from postgresSQL

-- New chores will be one-time unless a recurrence is chosen.
ALTER TABLE chores
  ALTER COLUMN recurrence_frequency SET DEFAULT 'one-time'; -- set default value to one-time for new chores

COMMIT; -- complete database transaction