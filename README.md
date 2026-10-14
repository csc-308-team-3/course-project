## Rules

Follow project conventions described in [Contribution Guidelines](conventions.md)

## Product Vision

For roommates who want to divide household responsibilities between each person fairly,
**ChoreMate** is a roommate chore-management web app that organizes chores,
assigns them to roommates, and rotates assignments each week so that everyone shares the work.
Unlike keeping track of everyone's tasks through group chats, notes, or memory,
**ChoreMate** gives our users one clear, fair, and easy-to-view chore schedule.

## ESLint and Prettier Setup

This project uses ESLint to check for code problems and Prettier to keep code formatting consistent.

After cloning the repository, install all project dependencies:

```bash
npm install
```

Check the project for ESLint issues:

```bash
npm run lint
```

Format all files with Prettier:

```bash
npm run format
```

## Backend database setup

ChoreMate's development PostgreSQL provider is **Supabase**. The Express backend uses the `pg` client and obtains its connection settings only from environment variables.

1. In Supabase, open the team's development project and select **Connect**. Copy a PostgreSQL connection string suitable for a Node.js application. Use the pooler connection string if your network cannot reach the direct database host.
2. Copy `.env.example` to `.env` in the repository root.
3. Set `DATABASE_URL` in `.env` to the connection string. Keep `DATABASE_SSL=true` for Supabase.
4. Set `SESSION_SECRET` to a long, random value. Set `CLIENT_ORIGIN` to the frontend URL (locally, `http://localhost:5173`).
5. Install backend dependencies with `npm install`.
6. Confirm the connection without starting the server:

   ```bash
   npm run db:check
   ```

7. Apply the team-approved schema SQL in Supabase's SQL Editor. This creates the application tables, password-hash column, and PostgreSQL-backed session table.

8. Start the backend:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000/health`. A successful response includes `"database": "connected"`. If configuration is missing or invalid, startup exits with a controlled message and the health endpoint returns HTTP 503 when a previously running server loses database access.

The `.env` file is ignored by Git. Share development credentials only through the team's approved secret-sharing method, never in the repository, issues, or pull requests.

### Schema dependency

Apply the schema from issue [#1](https://github.com/csc-308-team-3/course-project/issues/1) in Supabase, then inspect its tables and relationships in Supabase's Table Editor. The backend connection check intentionally runs only `SELECT NOW()` so it remains independent of schema creation.

### Resetting the development schema

The reset query permanently deletes every ChoreMate application table and its data. Keep that query in Supabase's SQL Editor or team documentation, run it only against the development project, and then run the schema query immediately afterward. Never use it against production data.

### Authentication API

The backend provides these session-based endpoints:

- `POST /auth/register` with `name`, `email`, and `password`
- `POST /auth/login` with `email` and `password`
- `POST /auth/logout`
- `GET /auth/session`

Passwords are stored only as bcrypt hashes. The browser receives an HTTP-only session cookie after a successful registration or login.

## Figma Storyboard Link

https://www.figma.com/proto/U7m0HnNWwKcZakiTlvs2xr/Wireframe-Example?node-id=0-1&t=qmyFBSCaSR7sL4gN-1
