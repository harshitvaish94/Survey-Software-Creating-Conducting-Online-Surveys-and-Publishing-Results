import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/surveys';

export default function SurveyCreate() {
const navigate = useNavigate();

const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [openDate, setOpenDate] = useState('');
const [closeDate, setCloseDate] = useState('');
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
const [saving, setSaving] = useState(false);
const [createdId, setCreatedId] = useState<number | null>(null);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setError('');
setSuccess('');
setCreatedId(null);


const trimmedTitle = title.trim();

if (!trimmedTitle) {
  setError('Survey title is required.');
  return;
}

if (openDate && closeDate && closeDate < openDate) {
  setError('Closing date cannot be earlier than opening date.');
  return;
}

setSaving(true);

try {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: trimmedTitle,
      description: description.trim(),
      openDate: openDate || undefined,
      closeDate: closeDate || undefined,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message;

    throw new Error(message || 'Unable to create the survey.');
  }

  setCreatedId(data.id);
  setSuccess(
    `Survey "${data.title}" was saved successfully with Draft status. ID: ${data.id}`,
  );
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : 'Unable to connect to the backend. Please try again.',
  );
} finally {
  setSaving(false);
}


}

return ( <section className="auth-card survey-card"> <h1>Create a Survey</h1> <p>Enter your survey details. New surveys are saved as Draft.</p>


  <form className="form" onSubmit={handleSubmit}>
    <label>
      Survey title *
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Student Feedback Survey"
        maxLength={200}
        required
      />
    </label>

    <label>
      Description
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Describe the purpose of your survey"
        rows={4}
      />
    </label>

    <label>
      Opening date
      <input
        type="date"
        value={openDate}
        onChange={(event) => setOpenDate(event.target.value)}
      />
      <span className="hint">Optional</span>
    </label>

    <label>
      Closing date
      <input
        type="date"
        value={closeDate}
        min={openDate || undefined}
        onChange={(event) => setCloseDate(event.target.value)}
      />
      <span className="hint">Optional</span>
    </label>

    <p className="hint">Initial status: Draft</p>

    {error && (
      <p className="error" role="alert">
        {error}
      </p>
    )}

    {success && (
      <p role="status">
        {success}
      </p>
    )}

    <div className="survey-actions">
      <button className="btn" type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Create Survey'}
      </button>

      <button
        className="btn btn-outline"
        type="button"
        onClick={() => navigate('/dashboard')}
      >
        Cancel
      </button>
    </div>

    {success && createdId !== null && (
      <button
        className="btn"
        type="button"
        onClick={() => navigate(`/surveys/${createdId}/edit`)}
      >
        Add questions
      </button>
    )}

    {success && (
      <button
        className="btn btn-outline"
        type="button"
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </button>
    )}
  </form>
</section>


);
}
