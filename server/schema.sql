BEGIN;

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0)
);

CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  recurrence_frequency TEXT NOT NULL
);

CREATE TABLE chore_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  due_date DATE NOT NULL,
  due_time TIME NOT NULL,
  status TEXT NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE chore_rotations (
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (chore_id, user_id),
  UNIQUE (chore_id, position)
);

CREATE TABLE swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_instance_id UUID NOT NULL REFERENCES chore_instances(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> recipient_id)
);

CREATE TABLE skip_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chore_instance_id UUID UNIQUE REFERENCES chore_instances(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chore_instance_id UUID REFERENCES chore_instances(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX chore_instances_assignee_id_idx ON chore_instances(assignee_id);
CREATE INDEX swap_requests_chore_instance_id_idx ON swap_requests(chore_instance_id);
CREATE INDEX notifications_user_id_idx ON notifications(user_id);

COMMIT;