import { useState } from 'react';
import { STATUSES, statusLabel } from '../constants.js';
import TaskForm from './TaskForm.jsx';

function formatDue(dateStr) {
  if (!dateStr) return null;
  // Parse as a local date; new Date('YYYY-MM-DD') would be treated as UTC.
  const [y, m, d] = dateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86_400_000);
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: due.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  if (days < 0) return { label: `Overdue · ${label}`, tone: 'overdue' };
  if (days === 0) return { label: 'Due today', tone: 'soon' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon' };
  return { label: `Due ${label}`, tone: '' };
}

export default function TaskItem({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="task">
        <TaskForm
          initial={task}
          onCancel={() => setEditing(false)}
          onSubmit={async (changes) => {
            const ok = await onUpdate(changes);
            if (ok) setEditing(false);
            return ok;
          }}
        />
      </li>
    );
  }

  const done = task.status === 'done';
  const due = !done && formatDue(task.due_date);

  return (
    <li className={`task${done ? ' done' : ''}`}>
      <input
        type="checkbox"
        className="check"
        checked={done}
        onChange={() => onUpdate({ status: done ? 'todo' : 'done' })}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="meta">
          <span className={`badge priority-${task.priority}`}>{task.priority}</span>
          <select
            className={`badge status status-${task.status}`}
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            aria-label="Status"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{statusLabel(s.value)}</option>)}
          </select>
          {due && <span className={`due ${due.tone}`}>{due.label}</span>}
        </div>
      </div>
      <div className="task-actions">
        <button className="secondary small" onClick={() => setEditing(true)}>Edit</button>
        <button
          className="danger small"
          onClick={() => { if (confirm(`Delete "${task.title}"?`)) onDelete(); }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
