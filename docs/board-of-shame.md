# Board of Shame Policy

- A chore instance is **missed** once its `due_date` + `due_time` (treated as UTC) has passed and it is not complete (`status` is not `complete`/`completed` and `completed_at` is empty).
- Missed chores are recorded in `missed_chores` (one row per chore instance) whenever a household's board is loaded, under the user assigned at that moment.
- A missed chore stays on the board even if it is completed later; `completedAt` shows when.
- `GET /api/households/:householdId/board-of-shame` returns the household's missed chores, newest first. Only members of that household can see it (401 if logged out, 403 otherwise).
- Apply `server/migrations/missed-chores.sql` to create the table.
