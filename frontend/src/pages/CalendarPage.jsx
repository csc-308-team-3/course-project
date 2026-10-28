import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { useHousehold } from '../context/HouseholdContext';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthRange(month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

function getCalendarDays(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  const emptyDaysBeforeMonth = Array(firstDay.getDay()).fill(null);
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);

    return {
      dayNumber: index + 1,
      date: formatDate(date),
      isToday: formatDate(date) === formatDate(new Date()),
    };
  });

  return [...emptyDaysBeforeMonth, ...monthDays];
}

function CalendarPage() {
  const { household } = useHousehold();
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedRoommate, setSelectedRoommate] = useState('');
  const [chores, setChores] = useState([]);
  const [calendarError, setCalendarError] = useState('');
  const [calendarLoading, setCalendarLoading] = useState(true);

  const { startDate, endDate } = getMonthRange(selectedMonth);
  const calendarDays = getCalendarDays(selectedMonth);

  const monthTitle = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const roommateOptions = useMemo(() => {
    const roommates = new Map();

    chores.forEach((chore) => {
      roommates.set(chore.assigneeId, chore.assigneeName);
    });

    return [...roommates.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [chores]);

  const choresByDate = useMemo(() => {
    return chores.reduce((groupedChores, chore) => {
      if (!groupedChores[chore.dueDate]) {
        groupedChores[chore.dueDate] = [];
      }

      groupedChores[chore.dueDate].push(chore);
      return groupedChores;
    }, {});
  }, [chores]);

  useEffect(() => {
    async function loadCalendar() {
      setCalendarLoading(true);
      setCalendarError('');

      try {
        const searchParams = new URLSearchParams({
          startDate,
          endDate,
        });

        if (selectedRoommate) {
          searchParams.set('roommateId', selectedRoommate);
        }

        const response = await fetch(
          `/api/households/${household.id}/calendar?${searchParams}`,
          { credentials: 'include' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load the calendar.');
        }

        setChores(data.chores);
      } catch (error) {
        setChores([]);
        setCalendarError(error.message);
      } finally {
        setCalendarLoading(false);
      }
    }

    loadCalendar();
  }, [endDate, household.id, selectedRoommate, startDate]);

  function changeMonth(monthOffset) {
    setSelectedMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + monthOffset,
          1,
        ),
    );
  }

  return (
    <main className="app-page household-page">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <div className="sparkle sparkle-one">✦</div>
      <div className="sparkle sparkle-two">✦</div>

      <section className="app-card household-card calendar-card">
        <Navbar />

        <section className="board-intro calendar-intro">
          <p className="eyebrow">HOUSEHOLD CHORE CALENDAR</p>
          <h1 className="board-title">{household.name}</h1>
          <p className="page-subtitle">
            See what is coming up and keep everyone on the same page.
          </p>
        </section>

        <section className="calendar-section">
          <div className="calendar-toolbar">
            <div className="calendar-month-controls">
              <button
                type="button"
                className="calendar-arrow-button"
                onClick={() => changeMonth(-1)}
                aria-label="Show previous month"
              >
                ←
              </button>

              <h2>{monthTitle}</h2>

              <button
                type="button"
                className="calendar-arrow-button"
                onClick={() => changeMonth(1)}
                aria-label="Show next month"
              >
                →
              </button>
            </div>

            <label className="calendar-filter">
              <span>Show</span>
              <select
                value={selectedRoommate}
                onChange={(event) => setSelectedRoommate(event.target.value)}
              >
                <option value="">Everyone</option>
                {roommateOptions.map((roommate) => (
                  <option key={roommate.id} value={roommate.id}>
                    {roommate.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {calendarLoading && <p>Loading calendar...</p>}

          {calendarError && <p>{calendarError}</p>}

          {!calendarLoading && !calendarError && (
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                (dayName) => (
                  <p className="calendar-day-name" key={dayName}>
                    {dayName}
                  </p>
                ),
              )}

              {calendarDays.map((day, index) =>
                day ? (
                  <article
                    className={`calendar-day${day.isToday ? ' calendar-day-today' : ''}`}
                    key={day.date}
                  >
                    <strong>{day.dayNumber}</strong>

                    <div className="calendar-chore-list">
                      {(choresByDate[day.date] ?? []).map((chore) => (
                        <p className="calendar-chore" key={chore.id}>
                          {chore.title}
                        </p>
                      ))}
                    </div>
                  </article>
                ) : (
                  <div
                    className="calendar-day calendar-day-empty"
                    key={`empty-${index}`}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default CalendarPage;
