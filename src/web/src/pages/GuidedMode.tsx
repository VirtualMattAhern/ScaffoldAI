import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import './Screen.css';

export function GuidedMode() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<{ id: string; title: string; status: string; timeboxMinutes?: number } | null>(null);
  const [subSteps, setSubSteps] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [helperText, setHelperText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDonePrompt, setShowDonePrompt] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!taskId) return;
    Promise.all([
      api.tasks.top3(),
      api.guided.getSubSteps(taskId),
      api.daily.helper(taskId),
    ]).then(([tasks, stepsRes, helperRes]) => {
      const found = tasks.find((t) => t.id === taskId);
      if (found) {
        setTask(found);
        if (found.status !== 'in_progress') {
          api.tasks.update(taskId, { status: 'in_progress' });
        }
      }
      setSubSteps(stepsRes.steps);
      setChecked(new Array(stepsRes.steps.length).fill(false));
      setHelperText(helperRes.text);
    }).finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (loading || paused) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, paused]);

  const toggleStep = useCallback((idx: number) => {
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timeboxTotal = task?.timeboxMinutes ? task.timeboxMinutes * 60 : 0;
  const remaining = timeboxTotal > 0 ? Math.max(0, timeboxTotal - elapsed) : 0;
  const isOvertime = timeboxTotal > 0 && elapsed > timeboxTotal;

  const handlePause = () => {
    if (!taskId) return;
    setPaused(true);
    api.tasks.update(taskId, { status: 'paused' });
  };

  const handleResume = () => {
    if (!taskId) return;
    setPaused(false);
    api.tasks.update(taskId, { status: 'in_progress' });
  };

  const handleDone = () => {
    if (!taskId) return;
    api.tasks.update(taskId, { status: 'done' });
    if (timerRef.current) clearInterval(timerRef.current);
    setShowDonePrompt(true);
  };

  if (loading) return <div className="screen-loading">Loading…</div>;
  if (!task) return <div className="screen-loading">Task not found.</div>;

  if (showDonePrompt) {
    return (
      <div className="screen guided-screen">
        <div className="task-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Great work. Take a breath.</h2>
          <p style={{ color: 'var(--muted)', margin: '1rem 0' }}>Ready for the next one?</p>
          <div className="task-actions" style={{ justifyContent: 'center' }}>
            <button onClick={() => navigate('/daily')}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen guided-screen">
      <h1>{task.title}</h1>
      <p className="subtitle">
        Status: {paused ? 'Paused' : task.status === 'in_progress' ? 'In Progress' : task.status}
      </p>

      <section className="task-card">
        <h3 style={{ margin: '0 0 0.25rem' }}>
          {timeboxTotal > 0 ? 'Time Remaining' : 'Elapsed Time'}
        </h3>
        <p style={{ fontSize: '1.8rem', fontWeight: 600, margin: 0, color: isOvertime ? '#dc2626' : 'var(--text)' }}>
          {timeboxTotal > 0 ? formatTime(remaining) : formatTime(elapsed)}
        </p>
        {isOvertime && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Over time by {formatTime(elapsed - timeboxTotal)}</p>}
      </section>

      <section style={{ margin: '1.5rem 0' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Sub-steps</h2>
        {subSteps.length === 0 ? (
          <p className="subtitle">Loading sub-steps…</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {subSteps.map((step, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: checked[i] ? 'line-through' : 'none',
                  color: checked[i] ? 'var(--muted)' : 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked[i] ?? false}
                  onChange={() => toggleStep(i)}
                  style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="helper">
        <h3>Guidance</h3>
        <p>{helperText || "Focus on the current step. You've got this."}</p>
      </section>

      <div className="task-actions" style={{ marginTop: '1.5rem' }}>
        <button onClick={() => navigate(`/decision/${taskId}`)}>Decision</button>
        {paused ? (
          <button onClick={handleResume}>Resume</button>
        ) : (
          <button onClick={handlePause}>Pause</button>
        )}
        <button onClick={handleDone}>Done</button>
        <button onClick={() => navigate('/daily')}>Back to Daily</button>
      </div>
    </div>
  );
}
