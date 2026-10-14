/* global jest, describe, test, expect, beforeEach, afterEach */
jest.mock('../db', () => ({
  getPool: jest.fn(),
}));

const express = require('express');
const { newDb, DataType } = require('pg-mem');
const { getPool } = require('../db');
const choreRoutes = require('../routes/choreRoutes');

const HOUSEHOLD_A = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_B = '99999999-9999-9999-9999-999999999999';

const alice = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  householdId: HOUSEHOLD_A,
  name: 'Alice',
};
const bob = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  householdId: HOUSEHOLD_A,
  name: 'Bob',
};
const carol = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  householdId: HOUSEHOLD_B,
  name: 'Carol',
};

let pool;
let server;
let baseUrl;

async function createSchema() {
  const database = newDb();
  database.public.registerFunction({
    name: 'to_char',
    args: [DataType.date, DataType.text],
    returns: DataType.text,
    implementation: (date) => new Date(date).toISOString().slice(0, 10),
  });
  const { Pool } = database.adapters.createPg();
  pool = new Pool();

  await pool.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      name text NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE chores (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      title text NOT NULL,
      instructions text,
      category text NOT NULL,
      created_by uuid
    )
  `);
  await pool.query(`
    CREATE TABLE chore_instances (
      id uuid PRIMARY KEY,
      chore_id uuid NOT NULL,
      assignee_id uuid NOT NULL,
      due_date date,
      due_time time,
      status text NOT NULL,
      completed_at timestamp with time zone
    )
  `);

  for (const user of [alice, bob, carol]) {
    await pool.query(
      'INSERT INTO users (id, household_id, name) VALUES ($1, $2, $3)',
      [user.id, user.householdId, user.name],
    );
  }

  getPool.mockReturnValue(pool);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  // Stand-in for the auth backend, which sets request.user.
  app.use((request, _response, next) => {
    const header = request.headers['x-test-user'];
    request.user = header ? JSON.parse(header) : undefined;
    next();
  });
  app.use('/api/households', choreRoutes);

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function api(method, path, { user, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': JSON.stringify(user) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
  };
}

const choresPath = (householdId = HOUSEHOLD_A) =>
  `/api/households/${householdId}/chores`;

function newChore(overrides = {}) {
  return {
    title: 'Wash dishes',
    category: 'Kitchen',
    instructions: 'Dry rack, then cabinets.',
    assigneeId: bob.id,
    dueDate: '2026-10-14',
    dueTime: '18:30',
    ...overrides,
  };
}

async function createChoreAs(user, overrides) {
  const result = await api('POST', choresPath(user.householdId), {
    user,
    body: newChore(overrides),
  });
  expect(result.status).toBe(201);
  return result.body;
}

beforeEach(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await createSchema();
  await startServer();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  jest.restoreAllMocks();
});

describe('creating chores', () => {
  test('creates a chore with every field and returns it', async () => {
    const { status, body } = await api('POST', choresPath(), {
      user: alice,
      body: newChore(),
    });

    expect(status).toBe(201);
    expect(body).toMatchObject({
      householdId: HOUSEHOLD_A,
      title: 'Wash dishes',
      instructions: 'Dry rack, then cabinets.',
      category: 'Kitchen',
      createdBy: alice.id,
      assigneeId: bob.id,
      dueDate: '2026-10-14',
      dueTime: '18:30',
      status: 'todo',
      completedAt: null,
    });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('creates a chore without instructions or a due date', async () => {
    const { status, body } = await api('POST', choresPath(), {
      user: alice,
      body: { title: 'Mop', category: 'Cleaning', assigneeId: alice.id },
    });

    expect(status).toBe(201);
    expect(body).toMatchObject({
      instructions: null,
      dueDate: null,
      dueTime: null,
      status: 'todo',
    });
  });

  test('allows a chore to be assigned to the creator', async () => {
    const chore = await createChoreAs(alice, { assigneeId: alice.id });

    expect(chore.assigneeId).toBe(alice.id);
  });

  test('persists the chore so it can be read back', async () => {
    const created = await createChoreAs(alice);
    const fetched = await api('GET', `${choresPath()}/${created.id}`, {
      user: bob,
    });

    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(created);
  });

  test('rejects invalid fields with 400 and creates nothing', async () => {
    const { status, body } = await api('POST', choresPath(), {
      user: alice,
      body: newChore({ title: '', dueDate: '2026-02-30', dueTime: '25:00' }),
    });

    expect(status).toBe(400);
    expect(body.details).toHaveLength(3);

    const { rows } = await pool.query('SELECT id FROM chores');
    expect(rows).toHaveLength(0);
  });

  test('rejects a non-object body', async () => {
    const { status } = await api('POST', choresPath(), {
      user: alice,
      body: ['not', 'an', 'object'],
    });

    expect(status).toBe(400);
  });

  test('rejects an assignee who is not in the household', async () => {
    const { status, body } = await api('POST', choresPath(), {
      user: alice,
      body: newChore({ assigneeId: carol.id }),
    });

    expect(status).toBe(400);
    expect(body.error).toMatch(/member of this household/);
    expect((await pool.query('SELECT id FROM chores')).rows).toHaveLength(0);
  });

  test('rejects an unknown assignee ID', async () => {
    const { status } = await api('POST', choresPath(), {
      user: alice,
      body: newChore({
        assigneeId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      }),
    });

    expect(status).toBe(400);
  });

  test('rejects a due time when the due date is explicitly null', async () => {
    const { status } = await api('POST', choresPath(), {
      user: alice,
      body: { ...newChore(), dueDate: null, status: 'complete' },
    });

    expect(status).toBe(400);
  });

  test('ignores a householdId or createdBy supplied in the body', async () => {
    const { body } = await api('POST', choresPath(), {
      user: alice,
      body: newChore({ householdId: HOUSEHOLD_B, createdBy: carol.id }),
    });

    expect(body.householdId).toBe(HOUSEHOLD_A);
    expect(body.createdBy).toBe(alice.id);
  });
});

describe('reading chores', () => {
  test('lists the household chores ordered by due date, undated last', async () => {
    await createChoreAs(alice, { title: 'Later', dueDate: '2026-10-20' });
    await createChoreAs(alice, {
      title: 'Undated',
      dueDate: null,
      dueTime: null,
    });
    await createChoreAs(alice, { title: 'Sooner', dueDate: '2026-10-12' });

    const { status, body } = await api('GET', choresPath(), { user: bob });

    expect(status).toBe(200);
    expect(body.chores.map((chore) => chore.title)).toEqual([
      'Sooner',
      'Later',
      'Undated',
    ]);
  });

  test('returns an empty list for a household with no chores', async () => {
    const { status, body } = await api('GET', choresPath(), { user: alice });

    expect(status).toBe(200);
    expect(body).toEqual({ chores: [] });
  });

  test('filters by assignee and by status', async () => {
    await createChoreAs(alice, { title: 'Bob chore', assigneeId: bob.id });
    await createChoreAs(alice, { title: 'Alice chore', assigneeId: alice.id });
    const done = await createChoreAs(alice, {
      title: 'Done chore',
      assigneeId: alice.id,
    });
    await api('PATCH', `${choresPath()}/${done.id}`, {
      user: alice,
      body: { status: 'complete' },
    });

    const byAssignee = await api(
      'GET',
      `${choresPath()}?assigneeId=${bob.id}`,
      {
        user: alice,
      },
    );
    expect(byAssignee.body.chores.map((chore) => chore.title)).toEqual([
      'Bob chore',
    ]);

    const byStatus = await api('GET', `${choresPath()}?status=complete`, {
      user: alice,
    });
    expect(byStatus.body.chores.map((chore) => chore.title)).toEqual([
      'Done chore',
    ]);
  });

  test('rejects invalid list filters', async () => {
    const badAssignee = await api('GET', `${choresPath()}?assigneeId=zzz`, {
      user: alice,
    });
    const badStatus = await api('GET', `${choresPath()}?status=finished`, {
      user: alice,
    });

    expect(badAssignee.status).toBe(400);
    expect(badStatus.status).toBe(400);
  });

  test('returns 404 for a chore that does not exist', async () => {
    const { status } = await api(
      'GET',
      `${choresPath()}/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`,
      { user: alice },
    );

    expect(status).toBe(404);
  });

  test('returns 400 for a malformed chore ID', async () => {
    const { status } = await api('GET', `${choresPath()}/not-a-uuid`, {
      user: alice,
    });

    expect(status).toBe(400);
  });
});

describe('editing chores', () => {
  test('updates the shared fields and the schedule', async () => {
    const chore = await createChoreAs(alice);

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: {
        title: 'Clean kitchen',
        category: 'Cleaning',
        instructions: 'Wipe counters.',
        dueDate: '2026-10-15',
        dueTime: '09:00',
      },
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({
      id: chore.id,
      title: 'Clean kitchen',
      category: 'Cleaning',
      instructions: 'Wipe counters.',
      dueDate: '2026-10-15',
      dueTime: '09:00',
      assigneeId: bob.id,
    });
  });

  test('leaves fields that were not sent unchanged', async () => {
    const chore = await createChoreAs(alice);

    const { body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { title: 'Renamed' },
    });

    expect(body).toEqual({ ...chore, title: 'Renamed' });
  });

  test('any household member can edit a chore they did not create', async () => {
    const chore = await createChoreAs(alice);

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { title: 'Edited by Bob' },
    });

    expect(status).toBe(200);
    expect(body.title).toBe('Edited by Bob');
  });

  test('clearing the due date also clears the due time', async () => {
    const chore = await createChoreAs(alice);

    const { body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { dueDate: null },
    });

    expect(body.dueDate).toBeNull();
    expect(body.dueTime).toBeNull();
  });

  test('cannot set a due time on a chore with no due date', async () => {
    const chore = await createChoreAs(alice, { dueDate: null, dueTime: null });

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { dueTime: '10:00' },
    });

    expect(status).toBe(400);
    expect(body.error).toMatch(/dueTime/);
  });

  test('rejects invalid edits and leaves the chore untouched', async () => {
    const chore = await createChoreAs(alice);

    const { status } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { title: '   ', status: 'bogus' },
    });
    const after = await api('GET', `${choresPath()}/${chore.id}`, {
      user: alice,
    });

    expect(status).toBe(400);
    expect(after.body).toEqual(chore);
  });

  test('rejects an empty update', async () => {
    const chore = await createChoreAs(alice);

    const { status } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: {},
    });

    expect(status).toBe(400);
  });

  test('returns 404 when editing a chore that does not exist', async () => {
    const { status } = await api(
      'PATCH',
      `${choresPath()}/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`,
      { user: alice, body: { title: 'Nope' } },
    );

    expect(status).toBe(404);
  });

  test('cannot move a chore to another household through the body', async () => {
    const chore = await createChoreAs(alice);

    const { body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { title: 'Moved?', householdId: HOUSEHOLD_B },
    });

    expect(body.householdId).toBe(HOUSEHOLD_A);
  });
});

describe('assigning chores', () => {
  test('reassigns a chore to another household member', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { assigneeId: alice.id },
    });

    expect(status).toBe(200);
    expect(body.assigneeId).toBe(alice.id);
  });

  test('cannot reassign a chore to a user from another household', async () => {
    const chore = await createChoreAs(alice);

    const { status } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { assigneeId: carol.id },
    });
    const after = await api('GET', `${choresPath()}/${chore.id}`, {
      user: alice,
    });

    expect(status).toBe(400);
    expect(after.body.assigneeId).toBe(bob.id);
  });

  test('rejects a malformed assignee ID', async () => {
    const chore = await createChoreAs(alice);

    const { status } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { assigneeId: 'bob' },
    });

    expect(status).toBe(400);
  });
});

describe('completion state', () => {
  test('the assignee can complete a chore, which records when', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    expect(status).toBe(200);
    expect(body.status).toBe('complete');
    expect(body.completedAt).not.toBeNull();
    expect(Number.isNaN(new Date(body.completedAt).getTime())).toBe(false);
  });

  test('a roommate who is not the assignee cannot complete the chore', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { status: 'complete' },
    });
    const after = await api('GET', `${choresPath()}/${chore.id}`, {
      user: bob,
    });

    expect(status).toBe(403);
    expect(body.error).toMatch(/assigned roommate/);
    expect(after.body.status).toBe('todo');
    expect(after.body.completedAt).toBeNull();
  });

  test('reopening a completed chore clears its completion time', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });
    await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    const { body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'todo' },
    });

    expect(body.status).toBe('todo');
    expect(body.completedAt).toBeNull();
  });

  test('only the assignee can reopen a completed chore', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });
    await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    const { status } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { status: 'todo' },
    });

    expect(status).toBe(403);
  });

  test('completing an already complete chore keeps the original time', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });
    const first = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    const second = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    expect(second.status).toBe(200);
    expect(second.body.completedAt).toEqual(first.body.completedAt);
  });

  test('a non-assignee can still edit other fields of a completed chore without changing its state', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });
    await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'complete' },
    });

    const { status, body } = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: alice,
      body: { title: 'Renamed', status: 'complete' },
    });

    expect(status).toBe(200);
    expect(body.status).toBe('complete');
    expect(body.title).toBe('Renamed');
  });

  test('accepts the due status and rejects unknown statuses', async () => {
    const chore = await createChoreAs(alice, { assigneeId: bob.id });

    const due = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'due' },
    });
    const bad = await api('PATCH', `${choresPath()}/${chore.id}`, {
      user: bob,
      body: { status: 'done' },
    });

    expect(due.body.status).toBe('due');
    expect(bad.status).toBe(400);
  });
});

describe('deleting chores', () => {
  test('deletes the chore and its assignment', async () => {
    const chore = await createChoreAs(alice);

    const removed = await api('DELETE', `${choresPath()}/${chore.id}`, {
      user: bob,
    });
    const fetched = await api('GET', `${choresPath()}/${chore.id}`, {
      user: alice,
    });

    expect(removed.status).toBe(204);
    expect(fetched.status).toBe(404);
    expect((await pool.query('SELECT id FROM chores')).rows).toHaveLength(0);
    expect(
      (await pool.query('SELECT id FROM chore_instances')).rows,
    ).toHaveLength(0);
  });

  test('only deletes the requested chore', async () => {
    const keep = await createChoreAs(alice, { title: 'Keep' });
    const drop = await createChoreAs(alice, { title: 'Drop' });

    await api('DELETE', `${choresPath()}/${drop.id}`, { user: alice });
    const list = await api('GET', choresPath(), { user: alice });

    expect(list.body.chores.map((chore) => chore.id)).toEqual([keep.id]);
  });

  test('returns 404 when the chore does not exist or was already deleted', async () => {
    const chore = await createChoreAs(alice);
    await api('DELETE', `${choresPath()}/${chore.id}`, { user: alice });

    const again = await api('DELETE', `${choresPath()}/${chore.id}`, {
      user: alice,
    });

    expect(again.status).toBe(404);
  });
});

describe('permissions and household isolation', () => {
  test('rejects every endpoint when the user is not authenticated', async () => {
    const chore = await createChoreAs(alice);
    const requests = [
      ['POST', choresPath(), newChore()],
      ['GET', choresPath()],
      ['GET', `${choresPath()}/${chore.id}`],
      ['PATCH', `${choresPath()}/${chore.id}`, { title: 'x' }],
      ['DELETE', `${choresPath()}/${chore.id}`],
    ];

    for (const [method, path, body] of requests) {
      const result = await api(method, path, { body });
      expect(result.status).toBe(401);
    }

    expect((await pool.query('SELECT id FROM chores')).rows).toHaveLength(1);
  });

  test('rejects a user from another household on every endpoint', async () => {
    const chore = await createChoreAs(alice);
    const requests = [
      ['POST', choresPath(), newChore()],
      ['GET', choresPath()],
      ['GET', `${choresPath()}/${chore.id}`],
      ['PATCH', `${choresPath()}/${chore.id}`, { title: 'Hacked' }],
      ['DELETE', `${choresPath()}/${chore.id}`],
    ];

    for (const [method, path, body] of requests) {
      const result = await api(method, path, { user: carol, body });
      expect(result.status).toBe(403);
      expect(JSON.stringify(result.body)).not.toContain('Wash dishes');
    }

    const after = await api('GET', `${choresPath()}/${chore.id}`, {
      user: alice,
    });
    expect(after.body).toEqual(chore);
  });

  test('a chore ID from another household is not found in your household', async () => {
    const secret = await createChoreAs(carol, {
      title: 'Carol secret',
      assigneeId: carol.id,
    });

    const read = await api('GET', `${choresPath(HOUSEHOLD_A)}/${secret.id}`, {
      user: alice,
    });
    const edit = await api('PATCH', `${choresPath(HOUSEHOLD_A)}/${secret.id}`, {
      user: alice,
      body: { title: 'Hijacked' },
    });
    const remove = await api(
      'DELETE',
      `${choresPath(HOUSEHOLD_A)}/${secret.id}`,
      { user: alice },
    );

    expect([read.status, edit.status, remove.status]).toEqual([404, 404, 404]);
    expect(JSON.stringify([read.body, edit.body, remove.body])).not.toContain(
      'Carol secret',
    );

    const untouched = await api(
      'GET',
      `${choresPath(HOUSEHOLD_B)}/${secret.id}`,
      {
        user: carol,
      },
    );
    expect(untouched.body.title).toBe('Carol secret');
  });

  test('listing never includes another household chores', async () => {
    await createChoreAs(alice, { title: 'Ours' });
    await createChoreAs(carol, { title: 'Theirs', assigneeId: carol.id });

    const mine = await api('GET', choresPath(HOUSEHOLD_A), { user: alice });
    const theirs = await api('GET', choresPath(HOUSEHOLD_B), { user: carol });

    expect(mine.body.chores.map((chore) => chore.title)).toEqual(['Ours']);
    expect(theirs.body.chores.map((chore) => chore.title)).toEqual(['Theirs']);
  });

  test('rejects a malformed household ID', async () => {
    const { status } = await api('GET', '/api/households/not-a-uuid/chores', {
      user: alice,
    });

    expect(status).toBe(400);
  });
});

describe('failure handling', () => {
  test('returns a generic 500 without leaking database details', async () => {
    getPool.mockReturnValue({
      query: jest
        .fn()
        .mockRejectedValue(new Error('password authentication failed for db')),
      connect: jest
        .fn()
        .mockRejectedValue(new Error('password authentication failed for db')),
    });

    const list = await api('GET', choresPath(), { user: alice });
    const create = await api('POST', choresPath(), {
      user: alice,
      body: newChore(),
    });

    expect(list.status).toBe(500);
    expect(create.status).toBe(500);
    expect(JSON.stringify([list.body, create.body])).not.toMatch(/password/);
  });

  test('rolls back and releases the connection when a write fails', async () => {
    const calls = [];
    const client = {
      query: jest.fn(async (sql) => {
        calls.push(String(sql).trim().split(/\s+/)[0]);
        if (sql.includes('FROM users')) {
          return { rows: [{ id: bob.id }] };
        }
        if (sql.includes('INSERT INTO chore_instances')) {
          throw new Error('insert failed');
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    getPool.mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });

    const { status } = await api('POST', choresPath(), {
      user: alice,
      body: newChore(),
    });

    expect(status).toBe(500);
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
