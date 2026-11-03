-- Store one shared announcement for each household and chore-board week.
CREATE TABLE IF NOT EXISTS weekly_announcements (
  -- Unique ID for this announcement record.
  id uuid PRIMARY KEY,

  -- The household that owns this announcement.
  -- Delete its announcements too if the household is deleted.
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- The Monday date that identifies the chore-board week.
  week_start date NOT NULL,

  -- The plain-text announcement that household members write.
  message text NOT NULL,

  -- The user who most recently saved or edited this announcement.
  updated_by_user_id uuid NOT NULL REFERENCES users(id),

  -- The time when this announcement was first created.
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),

  -- The time when this announcement was most recently changed.
  updated_at timestamp with time zone NOT NULL DEFAULT NOW(),

  -- Each household can have only one announcement for the same week.
  CONSTRAINT weekly_announcements_household_week_unique
    UNIQUE (household_id, week_start)
);