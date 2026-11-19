import { useState } from 'react';
import { PRIORITIES, STATUSES } from '../constants.js';

const EMPTY = { title: '', description: '', priority: 'medium', status: 'todo', due_date: '' };

/** Used both for creating a task and, with `initial` + `onCancel`, for editing one. */
export default function TaskForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial, due_date: initial?.due_date ?? '' }));
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await onSubmit({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    });
    setSaving(false);
    if (ok && !editing) setForm(EMPTY);
  };

  return (
    <form className={`task-form${editing ? ' editing' : ''}`} onSubmit={handleSubmit}>
      <input
        className="title-input"
        placeholder={editing ? 'Title' : 'What needs doing?'}
        value={form.title}
        onChange={set('title')}
        maxLength={200}
        required
        aria-label="Title"
      />
      <textarea placeholder="Details (optional)" value={form.description} onChange={set('description')} rows={2} aria-label="Description" />
      <div className="form-row">
        <label>
          Priority
          <select value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label>
          Due
          <input type="date" value={form.due_date} onChange={set('due_date')} />
        </label>
        <div className="form-actions">
          {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
          <button type="submit" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Add task'}
          </button>
        </div>
      </div>
    </form>
  );
}
