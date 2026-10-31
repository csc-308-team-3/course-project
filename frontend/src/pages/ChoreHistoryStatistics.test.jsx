import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import ChoreStatisticsPage from './ChoreStatisticsPage';
import ChoreHistoryPage from './ChoreHistoryPage';

const context = vi.hoisted(() => ({
  household: {},
}));

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: () => context.household,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Alex' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../services/choreHistory', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    getCurrentUtcMonth: () => '2026-10',
  };
});

const HOUSE = '11111111-1111-1111-1111-111111111111';
const OTHER_HOUSE = '22222222-2222-2222-2222-222222222222';
const CHORE = '33333333-3333-3333-3333-333333333333';

let fetchMock;

beforeEach(() => {
  context.household = {
    loading: false,
    household: { id: HOUSE, name: 'Our House' },
  };

  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function statistics(month = '2026-10', counts = [2, 0]) {
  return {
    householdId: HOUSE,
    month,
    timezone: 'UTC',
    members: [
      { memberId: 'alex', memberName: 'Alex', completedCount: counts[0] },
      { memberId: 'sam', memberName: 'Sam', completedCount: counts[1] },
    ],
  };
}

function history(entries = [], offset = 0) {
  return {
    householdId: HOUSE,
    chore: { id: CHORE, title: 'Wash dishes' },
    limit: 50,
    offset,
    history: entries,
  };
}

function entry(id = 'instance-1', name = 'Alex') {
  return {
    instanceId: id,
    memberId: `member-${id}`,
    memberName: name,
    completedAt: '2026-10-15T12:30:00.000Z',
  };
}

function renderPage(path = '/household/statistics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/household/statistics" element={<ChoreStatisticsPage />} />
        <Route
          path="/household/chores/:choreId/history"
          element={<ChoreHistoryPage />}
        />
        <Route path="/no-household" element={<h1>Join a household</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('displays monthly totals and members with zero completions', async () => {
  fetchMock.mockResolvedValue(jsonResponse(statistics()));

  renderPage();

  expect(
    await screen.findByText('2 completed chores in 2026-10'),
  ).toBeInTheDocument();

  const table = screen.getByRole('table', {
    name: 'Monthly completions by household member',
  });

  expect(
    within(table).getByRole('row', { name: 'Alex 2' }),
  ).toBeInTheDocument();
  expect(within(table).getByRole('row', { name: 'Sam 0' })).toBeInTheDocument();

  expect(fetchMock).toHaveBeenCalledWith(
    `/api/households/${HOUSE}/chore-statistics?month=2026-10`,
    expect.objectContaining({
      credentials: 'include',
      signal: expect.any(AbortSignal),
    }),
  );
});

test('changing month requests and displays the new month', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(statistics()))
    .mockResolvedValueOnce(jsonResponse(statistics('2026-11', [1, 3])));

  renderPage();
  await screen.findByText('2 completed chores in 2026-10');

  fireEvent.change(screen.getByLabelText('Month'), {
    target: { value: '2026-11' },
  });

  expect(
    await screen.findByText('4 completed chores in 2026-11'),
  ).toBeInTheDocument();
  expect(
    screen.queryByText('2 completed chores in 2026-10'),
  ).not.toBeInTheDocument();

  expect(fetchMock.mock.calls[1][0]).toBe(
    `/api/households/${HOUSE}/chore-statistics?month=2026-11`,
  );
});

test('an empty month value shows validation and sends no new request', async () => {
  fetchMock.mockResolvedValue(jsonResponse(statistics()));

  renderPage();
  await screen.findByText('2 completed chores in 2026-10');

  fireEvent.change(screen.getByLabelText('Month'), {
    target: { value: '' },
  });

  expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid month');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('displays the zero-completions empty state', async () => {
  fetchMock.mockResolvedValue(jsonResponse(statistics('2026-10', [0, 0])));

  renderPage();

  expect(
    await screen.findByText('No recorded completions for this month.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('row', { name: 'Alex 0' })).toBeInTheDocument();
});

test.each([
  [401, 'Your session has expired. Please log in again.'],
  [403, 'You do not have access to this household.'],
])('shows HTTP %s without displaying statistics', async (status, message) => {
  fetchMock.mockResolvedValue(jsonResponse({ error: 'Denied' }, status));

  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('a failed request can be retried successfully', async () => {
  fetchMock
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce(jsonResponse(statistics()));

  const user = userEvent.setup();
  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Network unavailable',
  );

  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(
    await screen.findByText('2 completed chores in 2026-10'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('ignores an obsolete month response', async () => {
  let finishOldRequest;

  fetchMock
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldRequest = resolve;
        }),
    )
    .mockResolvedValueOnce(jsonResponse(statistics('2026-11', [1, 3])));

  renderPage();
  const oldSignal = fetchMock.mock.calls[0][1].signal;

  fireEvent.change(screen.getByLabelText('Month'), {
    target: { value: '2026-11' },
  });

  await screen.findByText('4 completed chores in 2026-11');
  expect(oldSignal.aborted).toBe(true);

  await act(async () => {
    finishOldRequest(jsonResponse(statistics('2026-10', [99, 0])));
  });

  expect(screen.getByText('4 completed chores in 2026-11')).toBeInTheDocument();
  expect(
    screen.queryByText('99 completed chores in 2026-10'),
  ).not.toBeInTheDocument();
});

test('changing households hides old results while loading', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse(statistics()))
    .mockImplementationOnce(() => new Promise(() => {}));

  const view = renderPage();
  await screen.findByText('2 completed chores in 2026-10');

  context.household.household = {
    id: OTHER_HOUSE,
    name: 'Different House',
  };

  view.rerender(
    <MemoryRouter>
      <ChoreStatisticsPage />
    </MemoryRouter>,
  );

  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByText('Loading monthly summary...')).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/households/${OTHER_HOUSE}/chore-statistics?month=2026-10`,
      expect.any(Object),
    );
  });
});

test.each(['/household/statistics', `/household/chores/${CHORE}/history`])(
  'redirects without a household: %s',
  async (path) => {
    context.household.household = null;

    renderPage(path);

    expect(
      await screen.findByRole('heading', { name: 'Join a household' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

test('shows household loading without making an API request', () => {
  context.household.loading = true;

  renderPage();

  expect(screen.getByText('Loading household...')).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('displays chore history and preserves the timestamp in markup', async () => {
  fetchMock.mockResolvedValue(jsonResponse(history([entry()])));

  renderPage(`/household/chores/${CHORE}/history`);

  await screen.findByRole('heading', {
    name: 'Wash dishes: completion history',
  });

  expect(screen.getByRole('rowheader', { name: 'Alex' })).toBeInTheDocument();

  const table = screen.getByRole('table', {
    name: 'Recorded chore completions',
  });
  expect(table.querySelector('time')).toHaveAttribute(
    'datetime',
    '2026-10-15T12:30:00.000Z',
  );

  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('shows an empty history state', async () => {
  fetchMock.mockResolvedValue(jsonResponse(history()));

  renderPage(`/household/chores/${CHORE}/history`);

  expect(
    await screen.findByText('No recorded completions for this chore.'),
  ).toBeInTheDocument();
});

test('invalid chore links do not make API requests', () => {
  renderPage('/household/chores/not-a-uuid/history');

  expect(
    screen.getByRole('heading', { name: 'Invalid chore link' }),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('history displays a not-found API error', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ error: 'Chore not found.' }, 404));

  renderPage(`/household/chores/${CHORE}/history`);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Chore not found.',
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('history pagination requests the correct offset', async () => {
  const firstPage = Array.from({ length: 50 }, (_, index) =>
    entry(`instance-${index}`, `Roommate ${index}`),
  );

  fetchMock
    .mockResolvedValueOnce(jsonResponse(history(firstPage)))
    .mockResolvedValueOnce(
      jsonResponse(history([entry('older', 'Older roommate')], 50)),
    )
    .mockResolvedValueOnce(jsonResponse(history(firstPage)));

  const user = userEvent.setup();
  renderPage(`/household/chores/${CHORE}/history`);

  await screen.findByRole('rowheader', { name: 'Roommate 0' });
  await user.click(screen.getByRole('button', { name: 'Next page' }));

  await screen.findByRole('rowheader', { name: 'Older roommate' });

  expect(fetchMock.mock.calls[1][0]).toBe(
    `/api/households/${HOUSE}/chores/${CHORE}/history?limit=50&offset=50`,
  );
  expect(screen.getByText('Page 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Previous page' }));

  await screen.findByRole('rowheader', { name: 'Roommate 0' });

  expect(fetchMock.mock.calls[2][0]).toBe(
    `/api/households/${HOUSE}/chores/${CHORE}/history?limit=50&offset=0`,
  );
});
