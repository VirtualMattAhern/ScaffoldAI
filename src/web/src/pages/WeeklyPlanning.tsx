import { useEffect, useState } from 'react';
import { api } from '../api/client';
import './Screen.css';

type Task = {
  id: string;
  title: string;
  status: string;
  type: string;
  goalId?: string;
  top3Candidate: boolean;
  createdAt: string;
};

export function WeeklyPlanning() {
  const [brainDump, setBrainDump] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const loadTasks = () => {
    const params: { status?: string; type?: string } = {};
    if (filterStatus) params.status = filterStatus;
    if (filterType) params.type = filterType;
    return api.tasks.list(Object.keys(params).length ? params : undefined);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([api.brainDump.get(), loadTasks()]).then(([dump, taskList]) => {
      setBrainDump(dump.rawText);
      setTasks(taskList);
    }).finally(() => setLoading(false));
  }, [filterStatus, filterType]);

  const handleSaveDump = () => {
    api.brainDump.save(brainDump);
  };

  const handleConvert = async () => {
    setConverting(true);
    setHelperMessage(null);
    try {
      await api.brainDump.save(brainDump);
      const result = await api.brainDump.convert();
      const taskList = await loadTasks();
      setTasks(taskList);
      if (result.explanation) setHelperMessage(result.explanation);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleSuggestTop3 = async () => {
    setSuggesting(true);
    setHelperMessage(null);
    try {
      const result = await api.tasks.aiSuggestTop3();
      const taskList = await loadTasks();
      setTasks(taskList);
      if (result.explanation) setHelperMessage(result.explanation);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Suggestion failed');
    } finally {
      setSuggesting(false);
    }
  };

  const handleQuickAdd = async () => {
    const title = quickAdd.trim();
    if (!title) return;
    setQuickAdd('');
    try {
      const task = await api.tasks.create({ title, type: 'one_off' }) as Task;
      setTasks((prev) => [...prev, task]);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Failed to add task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.tasks.update(id, { status: 'done' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  if (loading) return <div className="screen-loading">Loading…</div>;

  return (
    <div className="screen">
      <h1>Weekly — Planning</h1>

      <section className="brain-dump">
        <h2>Brain Dump</h2>
        <p className="subtitle">Capture anything on your mind for this week. AI can convert ideas into goals and tasks.</p>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          onBlur={handleSaveDump}
          placeholder="Need to reorder candles&#10;Create Instagram post about restock&#10;Pay supplier invoice&#10;Plan spring pop-up event&#10;Reply to customer email about shipping"
          rows={6}
        />
        <div className="actions">
          <button onClick={handleConvert} disabled={converting}>
            {converting ? 'Organizing your ideas…' : 'AI Convert'}
          </button>
        </div>
      </section>

      <p className="flow-hint">AI organizes goals + tasks for the week ↓</p>

      <section className="task-list">
        <h2>Weekly Task List</h2>
        <p className="subtitle">Filter by status or type — open items sorted to top</p>

        <div className="task-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <label>
            Status:
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--skafold-radius-sm)', border: '1px solid var(--skafold-slate-200)' }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label>
            Type:
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--skafold-radius-sm)', border: '1px solid var(--skafold-slate-200)' }}
            >
              <option value="">All</option>
              <option value="one_off">One-off</option>
              <option value="repeat">Repeat</option>
              <option value="playbook">Playbook</option>
            </select>
          </label>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet.</p>
            <p>Add ideas to Brain Dump and tap AI Convert, or add a task manually.</p>
          </div>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Top 3</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={t.status === 'done' ? 'task-done' : ''}>
                  <td>{t.title}</td>
                  <td><span className={`status-badge status-${t.status}`} title={`Status: ${t.status.replace('_', ' ')}`}>{t.status.replace('_', ' ')}</span></td>
                  <td title={t.top3Candidate ? 'Marked as Top 3 for today' : 'Not in Top 3'}>{t.top3Candidate ? '★' : ''}</td>
                  <td title={`Task type: ${t.type.replace('_', ' ')}`}>{t.type.replace('_', ' ')}</td>
                  <td><button className="delete-btn" onClick={() => handleDeleteTask(t.id)} title="Delete">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="actions-row">
          <div className="quick-add">
            <input
              type="text"
              placeholder="Add idea…"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && quickAdd.trim()) handleQuickAdd(); }}
            />
            <button onClick={handleQuickAdd} disabled={!quickAdd.trim()}>Add</button>
          </div>
          <button onClick={handleSuggestTop3} disabled={suggesting || tasks.length === 0}>
            {suggesting ? 'Suggesting…' : 'AI Suggest Top 3'}
          </button>
        </div>
      </section>

      <section className="helper">
        <h3>Your SkafoldAI Helper</h3>
        <p>
          {helperMessage ??
            'I converted your brain dump into weekly goals and tasks. I also marked three likely high-impact items with a * so you can turn them into your Daily Rule of 3 when you\'re ready.'}
        </p>
      </section>
    </div>
  );
}
