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

  useEffect(() => {
    Promise.all([api.brainDump.get(), api.tasks.list()]).then(([dump, taskList]) => {
      setBrainDump(dump.rawText);
      setTasks(taskList);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveDump = () => {
    api.brainDump.save(brainDump);
  };

  const handleConvert = async () => {
    setConverting(true);
    setHelperMessage(null);
    try {
      await api.brainDump.save(brainDump);
      const result = await api.brainDump.convert();
      const taskList = await api.tasks.list();
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
      const taskList = await api.tasks.list();
      setTasks(taskList);
      if (result.explanation) setHelperMessage(result.explanation);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Suggestion failed');
    } finally {
      setSuggesting(false);
    }
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
        <p className="subtitle">Scrollable / filterable list — open items sorted to top</p>

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
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.status}</td>
                  <td>{t.top3Candidate ? '*' : ''}</td>
                  <td>{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="actions-row">
          <div className="quick-add">
            <input type="text" placeholder="Add idea…" />
            <button>Add</button>
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
