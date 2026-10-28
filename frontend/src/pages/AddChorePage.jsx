import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { createChore, getWeekStart } from '../services/chores';
import '../styles/add-chore.css';

function validateForm(form, members) {
  const errors = [];

  if (!form.title.trim()) errors.push('Enter a chore title.');
  if (!form.category.trim()) errors.push('Enter a category.');
  if (!form.instructions.trim()) errors.push('Enter instructions.');

  if (!members.includes(form.assigneeId)) {
    errors.push('Choose a roommate from your household.');
  }

  const dueDate =
    form.type === 'recurring'
      ? form.recurrenceStartDate
      : form.dueDate;

  try {
    getWeekStart(dueDate);
  } catch {
    errors.push(
      form.type === 'recurring'
        ? 'Enter a valid recurrence start date.'
        : 'Enter a valid due date.',
    );
  }

  if (
    form.type === 'recurring' &&
    !['daily', 'weekly', 'monthly'].includes(form.frequency)
  ) {
    errors.push('Choose a valid recurrence frequency.');
  }

  return errors;
}

function AddChorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { household, loading } = useHousehold();

  const [form, setForm] = useState({
    title: '',
    category: '',
    assigneeId: '',
    instructions: '',
    dueDate: '',
    type: 'one-time',
    frequency: 'weekly',
    recurrenceStartDate: '',
  });
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return <main className="app-page">Loading household...</main>;
  }

  if (!household) {
    return <Navigate to="/no-household" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const validationErrors = validateForm(form, household.members);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const recurring = form.type === 'recurring';
    const dueDate = recurring
      ? form.recurrenceStartDate
      : form.dueDate;

    setErrors([]);
    setIsSubmitting(true);

    try {
      await createChore(household.id, {
        title: form.title.trim(),
        category: form.category.trim(),
        instructions: form.instructions.trim(),
        assigneeId: form.assigneeId,
        dueDate,
        recurrenceFrequency: recurring
          ? form.frequency
          : 'one-time',
        recurrenceStartDate: recurring
          ? form.recurrenceStartDate
          : null,
      });
    } catch (error) {
      setErrors([error.message || 'Unable to create chore.']);
      setIsSubmitting(false);
      return;
    }

    navigate('/household', {
      replace: true,
      state: {
        choreCreated: true,
        weekStart: getWeekStart(dueDate),
      },
    });
  }

  return (
    <main className="app-page">
      <section className="app-card add-chore-card">
        <header className="household-nav">
          <div className="household-brand">
            <div className="brand-mark">⌂</div>
            <strong>ChoreMate</strong>
          </div>

          <nav className="nav-actions" aria-label="Main navigation">
            <Link className="nav-button" to="/household">
              Household
            </Link>
            <Link className="nav-button" to="/awards">
              Awards
            </Link>
            <Link className="nav-button" to="/profile">
              Profile
            </Link>
            <LogoutButton />
          </nav>
        </header>

        <p className="eyebrow">HOUSEHOLD CHORES</p>
        <h1 className="page-title">Add chore</h1>
        <p className="page-subtitle">
          Create a chore for {household.name}.
        </p>

        <form
          className="add-chore-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isSubmitting}
        >
          {errors.length > 0 && (
            <div className="form-error" role="alert">
              <p>Please check the following:</p>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <fieldset disabled={isSubmitting}>
            <label htmlFor="chore-title">Chore title</label>
            <input
              id="chore-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <label htmlFor="chore-category">Category</label>
            <input
              id="chore-category"
              name="category"
              placeholder="For example, Kitchen"
              value={form.category}
              onChange={handleChange}
              required
            />

            <label htmlFor="chore-assignee">Assigned roommate</label>
            <select
              id="chore-assignee"
              name="assigneeId"
              value={form.assigneeId}
              onChange={handleChange}
              required
            >
              <option value="">Choose a roommate</option>
              {household.members.map((id, index) => (
                <option key={id} value={id}>
                  {id === user.id
                    ? `${user.name} (You)`
                    : `Roommate ${index + 1}`}
                </option>
              ))}
            </select>

            <label htmlFor="chore-instructions">Instructions</label>
            <textarea
              id="chore-instructions"
              name="instructions"
              rows={4}
              value={form.instructions}
              onChange={handleChange}
              required
            />

            <label htmlFor="chore-type">Chore type</label>
            <select
              id="chore-type"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="one-time">One-time chore</option>
              <option value="recurring">Recurring chore</option>
            </select>

            {form.type === 'one-time' ? (
              <>
                <label htmlFor="chore-due-date">Due date</label>
                <input
                  id="chore-due-date"
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="chore-frequency">Frequency</label>
                <select
                  id="chore-frequency"
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <label htmlFor="chore-start-date">
                  Recurrence start date / first due date
                </label>
                <input
                  id="chore-start-date"
                  name="recurrenceStartDate"
                  type="date"
                  value={form.recurrenceStartDate}
                  onChange={handleChange}
                  required
                />
              </>
            )}

            <div className="add-chore-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving chore...' : 'Save chore'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate('/household')}
              >
                Cancel
              </button>
            </div>
          </fieldset>

          <p role="status">
            {isSubmitting ? 'Saving your chore. Please wait.' : ''}
          </p>
        </form>
      </section>
    </main>
  );
}

export default AddChorePage;