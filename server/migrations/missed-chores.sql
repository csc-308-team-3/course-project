-- Board of Shame (#50): one row per chore instance that passed its due time unfinished.
CREATE TABLE IF NOT EXISTS missed_chores (
  chore_instance_id uuid PRIMARY KEY REFERENCES chore_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  missed_at timestamptz NOT NULL DEFAULT NOW()
);
