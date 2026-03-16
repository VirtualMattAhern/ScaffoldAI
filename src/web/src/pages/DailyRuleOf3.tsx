import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
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
  const helperRef = useRef<HTMLElement>(null);

  useEffect(() => {
    Promise.all([api.focusSentence.get(), api.tasks.top3()]).then(([fs, taskList]) => {
      setFocusSentence(fs.sentence);
      setTasks(taskList);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.daily.helper(activeTaskId ?? undefined).then((r) => setHelperText(r.text)).catch(() => setHelperText(''));
  }, [tasks, activeTaskId]);

  useEffect(() => {
    if (activeTaskId && helperRef.current) helperRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeTaskId]);

  const handleSaveFocus = () => {
    api.focusSentence.save(focusSentence);
  };

  const handleSuggestFocus = async () => {
    const { sentence } = await api.focusSentence.suggest();
    setFocusSentence(sentence);
    api.focusSentence.save(sentence);
  };

  const handleStart = (id: string) => {
    api.tasks.update(id, { status: 'in_progress' });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'in_progress' } : t)));
    setActiveTaskId(id);
  };

  const handleDone = (id: string) => {
    api.tasks.update(id, { status: 'done' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const handlePause = (id: string) => {
    api.tasks.update(id, { status: 'paused' });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'paused' } : t)));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  if (loading) return <div className="screen-loading">Loading…</div>;

  return (
    <div className="screen daily-screen">
      <h1>Daily — Rule of 3</h1>

      <section className="focus-sentence">
        <label htmlFor="focus">Focus sentence</label>
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

      <section className="top3">
        <h2>Today's Top 3</h2>
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks for today.</p>
            <p>Go to Weekly Planning to add tasks, then use AI Suggest Top 3.</p>
          </div>
        ) : (
          <ul className="task-cards">
            {tasks.map((t, i) => (
              <li key={t.id} className="task-card">
                <div className="task-card-header">
                  <span className="task-num">{i + 1}.</span>
                  <span className="task-title">{t.title}</span>
                </div>
                {t.nextStep && <p className="next-step">Next 10 min: {t.nextStep}</p>}
                <div className="task-meta">
                  {t.timeboxMinutes && <span>Timebox: {t.timeboxMinutes} min</span>}
                  <span>Task age: {taskAge(t.createdAt)}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => handleStart(t.id)}>Start</button>
                  <button onClick={() => handlePause(t.id)}>Pause</button>
                  <button onClick={() => handleDone(t.id)}>Done</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="helper" ref={helperRef}>
        <h3>Your SkafoldAI Helper</h3>
        <p>{helperText || 'Start with the first task.'}</p>
      </section>
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
