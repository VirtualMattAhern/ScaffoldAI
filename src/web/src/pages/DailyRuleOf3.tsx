import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSettings } from '../contexts/SettingsContext';
import './Screen.css';

type Task = {
  id: string;
  title: string;
  status: string;
  nextStep?: string;
  timeboxMinutes?: number;
  createdAt: string;
};

export function DailyRuleOf3() {
  const [focusSentence, setFocusSentence] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [helperText, setHelperText] = useState('');
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [transition, setTransition] = useState(false);
  const [lowEnergy, setLowEnergy] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helperRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    Promise.all([api.focusSentence.get(), api.tasks.top3()]).then(([fs, taskList]) => {
      setFocusSentence(fs.sentence);
      setTasks(taskList);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.daily.helper({ activeTaskId: activeTaskId ?? undefined, lowEnergy: !!lowEnergy }).then((r) => setHelperText(r.text)).catch(() => setHelperText(''));
  }, [tasks, activeTaskId, lowEnergy]);

  const handleSaveFocus = () => { api.focusSentence.save(focusSentence); };

  const handleSuggestFocus = async () => {
    const { sentence } = await api.focusSentence.suggest();
    setFocusSentence(sentence);
    api.focusSentence.save(sentence);
  };

  const handleStart = (id: string) => {
    api.tasks.update(id, { status: 'in_progress' });
    navigate(`/guided/${id}`);
  };

  const handleDone = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    api.tasks.update(id, { status: 'done' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
    setUndoTask(task);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoTask(null);
      setTransition(true);
      setTimeout(() => setTransition(false), 5000);
    }, 5000);
  }, [tasks, activeTaskId]);

  const handleUndo = () => {
    if (!undoTask) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    api.tasks.update(undoTask.id, { status: undoTask.status });
    setTasks((prev) => [...prev, undoTask]);
    setUndoTask(null);
  };

  const handlePause = (id: string) => {
    api.tasks.update(id, { status: 'paused' });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'paused' } : t)));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const handleNotToday = async (id: string) => {
    await api.tasks.update(id, { top3Candidate: false });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  if (loading) return <div className="screen-loading">Loading…</div>;

  return (
    <div className="screen daily-screen">
      {settings.focusMode && (
        <div className="focus-mode-bar">
          <button type="button" onClick={() => updateSettings({ focusMode: false })} className="exit-focus-btn">
            Exit focus mode
          </button>
        </div>
      )}
      <h1>Daily — Rule of 3</h1>

      {transition && (
        <div className="transition-prompt">
          <p>Great work. Take a breath. Ready for the next one?</p>
        </div>
      )}

      {undoTask && (
        <div className="undo-toast">
          <span>"{undoTask.title}" marked done.</span>
          <button onClick={handleUndo}>Undo</button>
        </div>
      )}

      <section className="focus-sentence">
        <label htmlFor="focus">Focus sentence</label>
        <label className="low-energy-toggle" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={lowEnergy} onChange={(e) => setLowEnergy(e.target.checked)} />
          Low energy today — suggest easiest first
        </label>
        <div className="focus-row">
          <input
            id="focus"
            value={focusSentence}
            onChange={(e) => setFocusSentence(e.target.value)}
            onBlur={handleSaveFocus}
            placeholder="Today is for: moving the business forward without overload"
          />
          <button onClick={handleSuggestFocus} className="suggest-btn">Suggest</button>
        </div>
      </section>

      <section className="top3" aria-label="Today's top 3 tasks">
        <h2>Today's Top 3</h2>
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks for today.</p>
            <p>Go to Weekly Planning to add tasks, then use AI Suggest Top 3.</p>
          </div>
        ) : (
          <ul className="task-cards">
            {tasks.map((t, i) => (
              <li key={t.id} className={`task-card ${t.status === 'in_progress' ? 'task-card-active' : ''}`}>
                <div className="task-card-header">
                  <span className="task-num" title="Top 3 position">{i + 1}.</span>
                  <span className="task-title">{t.title}</span>
                  <span className={`status-badge status-${t.status}`} title={`Status: ${t.status.replace('_', ' ')}`}>{t.status.replace('_', ' ')}</span>
                </div>
                {t.nextStep && <p className="next-step" title="Suggested next step">Next 10 min: {t.nextStep}</p>}
                <div className="task-meta">
                  {t.timeboxMinutes && <span title="Timebox duration">Timebox: {t.timeboxMinutes} min</span>}
                  <span title="Days since task was created">Task age: {taskAge(t.createdAt)}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => handleStart(t.id)}>Start</button>
                  <button onClick={() => handlePause(t.id)}>Pause</button>
                  <button onClick={() => handleDone(t.id)}>Done</button>
                  <button onClick={() => handleNotToday(t.id)} className="not-today-btn">Not today</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!settings.focusMode && (
      <section className="helper" ref={helperRef} aria-live="polite" aria-atomic="true">
        <h3>Your SkafoldAI Helper</h3>
        <p>{helperText || 'Start with the first task.'}</p>
      </section>
      )}
    </div>
  );
}

function taskAge(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day';
  return `${diff} days`;
}
