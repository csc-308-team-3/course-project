import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useHousehold } from '../context/HouseholdContext';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getCurrentWeekStart() {
  const today = new Date();
  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
}

function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);

  const startLabel = weekStart.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  const endLabel = weekEnd.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return `Week of ${startLabel} – ${endLabel}`;
}

function getWeekOptions() {
  const currentWeekStart = getCurrentWeekStart();

  return [-2, -1, 0, 1, 2].map((weekOffset) => {
    const weekStart = addDays(currentWeekStart, weekOffset * 7);

    return {
      value: formatDate(weekStart),
      label: formatWeekLabel(weekStart),
    };
  });
}

function HouseholdPage() {
  const weekOptions = getWeekOptions();
  const [selectedWeek, setSelectedWeek] = useState(() =>
    formatDate(getCurrentWeekStart()),
  );
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState('');
  const [boardLoading, setBoardLoading] = useState(true);
  const { household } = useHousehold();
  const [copyMessage, setCopyMessage] = useState('');
  const [announcement, setAnnouncement] = useState(null);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);

  useEffect(() => {
    async function loadBoard() {
      setBoardLoading(true);
      setBoardError('');

      try {
        const response = await fetch(
          `/api/households/${household.id}/chore-board?weekStart=${selectedWeek}`,
          { credentials: 'include' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load the chore board.');
        }

        setBoard(data);
      } catch (error) {
        setBoard(null);
        setBoardError(error.message);
      } finally {
        setBoardLoading(false);
      }
    }

    loadBoard();
  }, [household.id, selectedWeek]);

    useEffect(() => {
    async function loadAnnouncement() {
      setAnnouncementLoading(true);
      setAnnouncementError('');

      try {
        const response = await fetch(
          `/api/households/${household.id}/announcements?weekStart=${selectedWeek}`,
          { credentials: 'include' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load the weekly announcement.');
        }

        setAnnouncement(data.announcement);
        setAnnouncementDraft(data.announcement?.message ?? '');
        setIsEditingAnnouncement(false);
      } catch (error) {
        setAnnouncement(null);
        setAnnouncementError(error.message);
      } finally {
        setAnnouncementLoading(false);
      }
    }

    loadAnnouncement();
  }, [household.id, selectedWeek]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopyMessage('Copied!');
    } catch {
      setCopyMessage('Copy failed');
    }

    window.setTimeout(() => setCopyMessage(''), 2000);
  }

  function startEditingAnnouncement() {
    setAnnouncementDraft(announcement?.message ?? '');
    setAnnouncementError('');
    setIsEditingAnnouncement(true);
  }

  function cancelEditingAnnouncement() {
    setAnnouncementDraft(announcement?.message ?? '');
    setAnnouncementError('');
    setIsEditingAnnouncement(false);
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    const message = announcementDraft.trim();
    const isDeletingAnnouncement = !message;

    setAnnouncementSaving(true);
    setAnnouncementError('');

    try {
      const response = await fetch(
        isDeletingAnnouncement
          ? `/api/households/${household.id}/announcements?weekStart=${selectedWeek}`
          : `/api/households/${household.id}/announcements`,
        {
          method: isDeletingAnnouncement ? 'DELETE' : 'PUT',
          credentials: 'include',
          headers: isDeletingAnnouncement
            ? undefined
            : { 'Content-Type': 'application/json' },
          body: isDeletingAnnouncement
            ? undefined
            : JSON.stringify({
                weekStart: selectedWeek,
                message,
              }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to save the announcement.');
      }

      if (isDeletingAnnouncement) {
        setAnnouncement(null);
        setAnnouncementDraft('');
      } else {
        const data = await response.json();
        setAnnouncement(data.announcement);
        setAnnouncementDraft(data.announcement.message);
      }

      setIsEditingAnnouncement(false);
    } catch (error) {
      setAnnouncementError(error.message);
    } finally {
      setAnnouncementSaving(false);
    }
  }

  function statusClass(status) {
    if (status === 'todo') return 'todo-task';
    if (status === 'due') return 'due-task';
    return 'complete-task';
  }

  function statusMessage(chore, status) {
    return status === 'complete'
      ? `Completed ${chore.dueDate}`
      : `Due ${chore.dueDate}`;
  }

  return (
    <main className="app-page household-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card household-card">
        <Navbar />

        <section className="board-intro">
          <p className="eyebrow">HOUSEHOLD CHORE BOARD</p>
          <h1 className="board-title">{household.name}</h1>

          <div className="board-details">
            <div className="week-picker">
              <select
                className="week-selector"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                aria-label="Choose a week"
              >
                {weekOptions.map((week) => (
                  <option key={week.value} value={week.value}>
                    {week.label}
                  </option>
                ))}
              </select>

              <span className="dropdown-arrow" aria-hidden="true">
                ▼
              </span>
            </div>

            <p className="group-code">
              Group code: <strong>{household.inviteCode}</strong>
              <button
                type="button"
                className="copy-code-button"
                onClick={handleCopyCode}
                title={copyMessage || 'Copy group code'}
                aria-label={copyMessage || 'Copy group code'}
              >
                {copyMessage === 'Copied!' ? '✓' : '⧉'}
              </button>
            </p>
          </div>
        </section>

        <section className="board-section">
          <div className="section-heading">
            <div className="announcement-content">
              <div className="announcement-heading">
                <p className="eyebrow">THIS WEEK'S ANNOUNCEMENT:</p>

                {!announcementLoading && !isEditingAnnouncement && announcement && (
                  <button
                    type="button"
                    className="text-button announcement-edit-button"
                    onClick={startEditingAnnouncement}
                  >
                    {announcement ? 'Edit announcement' : 'Add announcement'}
                  </button>
                )}
              </div>

              {announcementLoading && (
                <p className="announcement-message">Loading announcement...</p>
              )}

              {!announcementLoading && !isEditingAnnouncement && (
                <>
                  {announcement ? (
                    <h2 className="announcement-message">{announcement.message}</h2>
                  ) : (
                    <div className="announcement-empty-space">
                      <button
                        type="button"
                        className="small-primary-button announcement-add-button"
                        onClick={startEditingAnnouncement}
                      >
                        + Add announcement
                      </button>
                    </div>
                  )}
                </>
              )}

              {!announcementLoading && isEditingAnnouncement && (
                <form className="announcement-form" onSubmit={saveAnnouncement}>
                  <input
                    className="announcement-input"
                    type="text"
                    value={announcementDraft}
                    onChange={(event) => setAnnouncementDraft(event.target.value)}
                    placeholder="Write this week's announcement..."
                    maxLength="75"
                    aria-label="Weekly announcement"
                  />

                  <div className="announcement-form-actions">
                    <button
                      type="submit"
                      className="small-primary-button"
                      disabled={announcementSaving}
                    >
                      {announcementSaving ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type="button"
                      className="text-button"
                      onClick={cancelEditingAnnouncement}
                      disabled={announcementSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {announcementError && (
                <p className="announcement-error">{announcementError}</p>
              )}
            </div>

            <button type="button" className="small-primary-button">
              + Add chore
            </button>
          </div>

          <div className="chore-board">
            <div className="board-row board-labels">
              <p>Roommates</p>
              <p className="todo-label">To Do</p>
              <p className="due-label">Due Today</p>
              <p className="complete-label">Complete</p>
            </div>

            {boardLoading && (
              <div className="board-row">
                <div className="roommate-name">Loading chores...</div>
              </div>
            )}

            {boardError && (
              <div className="board-row">
                <div className="roommate-name">{boardError}</div>
              </div>
            )}

            {!boardLoading && !boardError && board.roommates.length === 0 && (
              <div className="board-row">
                <div className="roommate-name">No chores for this week.</div>
              </div>
            )}

            {board?.roommates.map((roommate) => (
              <div className="board-row" key={roommate.id}>
                <div className="roommate-name">{roommate.name}</div>

                {['todo', 'due', 'complete'].map((status) => (
                  <div key={status}>
                    {roommate.chores[status].map((chore) => (
                      <div
                        className={`task-card ${statusClass(status)}`}
                        key={chore.id}
                      >
                        <div>
                          <h3>{chore.title}</h3>
                          <p>{statusMessage(chore, status)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default HouseholdPage;
