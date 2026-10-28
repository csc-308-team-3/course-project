import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import AddChorePage from './AddChorePage';
import HouseholdPage from './HouseholdPage';

const context = vi.hoisted(() => ({
  auth: {},
  household: {},
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => context.auth,
}));

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: () => context.household,
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-2222-2222-222222222222';

let fetchMock;

beforeEach(() => {
  context.auth = {
    user: { id: USER_ID, name: 'Alex' },
    signOut: vi.fn(),
  };

  context.household = {
    loading: false,
    household: {
      id: HOUSEHOLD_ID,
      name: 'Our House',
      inviteCode: 'JOINME',
      members: [USER_ID],
    },
  };

  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function BoardDestination() {
  const location = useLocation();

  return (
    <>
      <h1>Household destination</h1>
      <p>Selected week: {location.state?.weekStart}</p>
      {location.state?.choreCreated && <p>Creation succeeded</p>}
    </>
  );
}

function renderPage(board = <BoardDestination />) {
  return render(
    <MemoryRouter initialEntries={['/household/chores/new']}>
      <Routes>
        <Route path="/household/chores/new" element={<AddChorePage />} />
        <Route path="/household" element={board} />
        <Route path="/no-household" element={<h1>Join a household</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillCommonFields(user) {
  await user.type(screen.getByLabelText('Chore title'), 'Wash dishes');
  await user.type(screen.getByLabelText('Category'), 'Kitchen');
  await user.selectOptions(screen.getByLabelText('Assigned roommate'), USER_ID);
  await user.type(
    screen.getByLabelText('Instructions'),
    'Wash and put away the dishes.',
  );
}

async function fillOneTimeChore(user) {
  await fillCommonFields(user);
  await user.type(screen.getByLabelText('Due date'), '2026-10-28');
}

test('submits a one-time chore and navigates to its week', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({ chore: { id: 'new-chore' } }, 201),
  );
  const user = userEvent.setup();
  renderPage();

  await fillOneTimeChore(user);
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  expect(
    await screen.findByRole('heading', {
      name: 'Household destination',
    }),
  ).toBeInTheDocument();

  expect(screen.getByText('Selected week: 2026-10-26')).toBeInTheDocument();
  expect(screen.getByText('Creation succeeded')).toBeInTheDocument();

  expect(fetchMock).toHaveBeenCalledTimes(1);

  const [url, options] = fetchMock.mock.calls[0];

  expect(url).toBe(`/api/households/${HOUSEHOLD_ID}/chores`);
  expect(options).toMatchObject({
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  expect(JSON.parse(options.body)).toEqual({
    title: 'Wash dishes',
    category: 'Kitchen',
    instructions: 'Wash and put away the dishes.',
    assigneeId: USER_ID,
    dueDate: '2026-10-28',
    recurrenceFrequency: 'one-time',
    recurrenceStartDate: null,
  });
});

test.each(['daily', 'weekly', 'monthly'])(
  'submits a %s recurring chore',
  async (frequency) => {
    fetchMock.mockResolvedValue(
      jsonResponse({ chore: { id: 'new-chore' } }, 201),
    );
    const user = userEvent.setup();
    renderPage();

    await fillCommonFields(user);
    await user.selectOptions(screen.getByLabelText('Chore type'), 'recurring');
    await user.selectOptions(screen.getByLabelText('Frequency'), frequency);
    await user.type(
      screen.getByLabelText(/Recurrence start date/),
      '2026-10-28',
    );
    await user.click(screen.getByRole('button', { name: 'Save chore' }));

    await screen.findByRole('heading', {
      name: 'Household destination',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      recurrenceFrequency: frequency,
      recurrenceStartDate: '2026-10-28',
      dueDate: '2026-10-28',
    });
  },
);

test('shows recurrence fields only for recurring chores', async () => {
  const user = userEvent.setup();
  renderPage();

  expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  expect(screen.queryByLabelText('Frequency')).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText('Chore type'), 'recurring');

  expect(screen.getByLabelText('Frequency')).toBeInTheDocument();
  expect(screen.getByLabelText(/Recurrence start date/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText('Chore type'), 'one-time');

  expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  expect(screen.queryByLabelText('Frequency')).not.toBeInTheDocument();
});

test('shows missing-field errors without sending a request', async () => {
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Enter a chore title.');
  expect(alert).toHaveTextContent('Enter a category.');
  expect(alert).toHaveTextContent('Enter instructions.');
  expect(alert).toHaveTextContent('Choose a roommate');
  expect(alert).toHaveTextContent('Enter a valid due date.');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('requires a start date for recurring chores', async () => {
  const user = userEvent.setup();
  renderPage();

  await fillCommonFields(user);
  await user.selectOptions(screen.getByLabelText('Chore type'), 'recurring');
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter a valid recurrence start date.',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('preserves input after an API failure and allows retry', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse(
        {
          error: 'Invalid chore.',
          details: ['The assigned roommate must belong to this household.'],
        },
        400,
      ),
    )
    .mockResolvedValueOnce(jsonResponse({ chore: { id: 'new-chore' } }, 201));

  const user = userEvent.setup();
  renderPage();

  await fillOneTimeChore(user);
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Invalid chore.');
  expect(alert).toHaveTextContent(
    'The assigned roommate must belong to this household.',
  );
  expect(screen.getByLabelText('Chore title')).toHaveValue('Wash dishes');
  expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-28');
  expect(screen.getByRole('button', { name: 'Save chore' })).toBeEnabled();
  expect(
    screen.queryByRole('heading', { name: 'Household destination' }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  await screen.findByRole('heading', {
    name: 'Household destination',
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('shows a network failure without leaving the form', async () => {
  fetchMock.mockRejectedValue(new Error('Network unavailable'));
  const user = userEvent.setup();
  renderPage();

  await fillOneTimeChore(user);
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Network unavailable',
  );
  expect(screen.getByLabelText('Chore title')).toHaveValue('Wash dishes');
  expect(screen.getByRole('button', { name: 'Save chore' })).toBeEnabled();
});

test('disables the form while saving', async () => {
  let finishRequest;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
  );
  const user = userEvent.setup();
  renderPage();

  await fillOneTimeChore(user);
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  expect(
    screen.getByRole('button', { name: 'Saving chore...' }),
  ).toBeDisabled();
  expect(screen.getByLabelText('Chore title')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Saving your chore.');
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    finishRequest(jsonResponse({ chore: { id: 'new-chore' } }, 201));
  });

  await screen.findByRole('heading', {
    name: 'Household destination',
  });
});

test('shows loading while household information is loading', () => {
  context.household.loading = true;
  renderPage();

  expect(screen.getByText('Loading household...')).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('redirects users without a household', async () => {
  context.household.household = null;
  renderPage();

  expect(
    await screen.findByRole('heading', { name: 'Join a household' }),
  ).toBeInTheDocument();
});

test('returns to the real board and fetches the saved chore week', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ chore: { id: 'new-chore' } }, 201))
    .mockResolvedValueOnce(
      jsonResponse({
        householdId: HOUSEHOLD_ID,
        weekStart: '2026-10-26',
        weekEnd: '2026-11-01',
        roommates: [
          {
            id: USER_ID,
            name: 'Alex',
            chores: {
              todo: [
                {
                  id: 'new-instance',
                  title: 'Wash dishes',
                  dueDate: '2026-10-28',
                },
              ],
              due: [],
              complete: [],
            },
          },
        ],
      }),
    );

  const user = userEvent.setup();
  renderPage(<HouseholdPage />);

  await fillOneTimeChore(user);
  await user.click(screen.getByRole('button', { name: 'Save chore' }));

  expect(
    await screen.findByText('Chore created successfully.'),
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/households/${HOUSEHOLD_ID}/chore-board?weekStart=2026-10-26`,
      { credentials: 'include' },
    );
  });

  expect(
    await screen.findByRole('heading', { name: 'Wash dishes' }),
  ).toBeInTheDocument();
});
