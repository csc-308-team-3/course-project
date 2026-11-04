// Board of Shame policy (issue #50): a chore instance is overdue once its due
// date/time has passed and it has not been completed.
const COMPLETE_STATUSES = ['complete', 'completed'];

function isOverdue(instance, now = new Date()) {
  if (COMPLETE_STATUSES.includes(instance.status) || instance.completed_at) {
    return false;
  }

  // due_date is 'YYYY-MM-DD' and due_time is 'HH:MM[:SS]' (see schema.sql).
  const due = new Date(`${instance.due_date}T${instance.due_time}Z`);

  return !Number.isNaN(due.getTime()) && due < now;
}

function findOverdueInstances(instances, now = new Date()) {
  return instances.filter((instance) => isOverdue(instance, now));
}

module.exports = { isOverdue, findOverdueInstances };