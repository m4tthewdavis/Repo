import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { STATUSES } from './constants.js';
import TaskForm from './components/TaskForm.jsx';
import TaskItem from './components/TaskItem.jsx';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await api.listTasks({ status, q: query.trim() }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  // Debounce so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  // Run a mutation, then refresh the list so filters and ordering stay correct.
  const mutate = async (fn) => {
    try {
      await fn();
      await load();
      return true;
    } catch (err) {
      await load(); // roll back any optimistic change (load clears errors, so set ours after)
      setError(err.message);
      return false;
    }
  };

  const counts = STATUSES.map((s) => ({ ...s, count: tasks.filter((t) => t.status === s.value).length }));

  return (
    <main className="container">
      <header className="header">
        <h1>Tasks</h1>
        <p className="muted">React + Express + PostgreSQL</p>
      </header>

      <TaskForm onSubmit={(task) => mutate(() => api.createTask(task))} />

      <section className="toolbar" aria-label="Filters">
        <input
          type="search"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tasks"
        />
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={status === ''} className={status === '' ? 'active' : ''} onClick={() => setStatus('')}>
            All
          </button>
          {counts.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={status === s.value}
              className={status === s.value ? 'active' : ''}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
              {status === '' && <span className="count">{s.count}</span>}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="error" role="alert">
          {error}
          <button className="link" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <p className="muted center">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="muted center">No tasks{status || query ? ' match these filters' : ' yet. Add one above'}.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={(changes) => {
                // Optimistic: show the change immediately; the reload in mutate() reconciles it.
                setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...changes } : t)));
                return mutate(() => api.updateTask(task.id, changes));
              }}
              onDelete={() => mutate(() => api.deleteTask(task.id))}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
