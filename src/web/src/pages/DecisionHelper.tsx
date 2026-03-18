import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import './Screen.css';

type DecisionOption = { label: string; description: string };
type PastDecision = {
  id: string;
  question: string;
  options: DecisionOption[];
  chosenOption: number | null;
  createdAt: string;
};

export function DecisionHelper() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [taskTitle, setTaskTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<DecisionOption[]>([]);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [pastDecisions, setPastDecisions] = useState<PastDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    Promise.all([
      api.tasks.top3(),
      api.decisions.list(taskId),
    ]).then(([tasks, decisions]) => {
      const found = tasks.find((t) => t.id === taskId);
      if (found) setTaskTitle(found.title);
      setPastDecisions(decisions);
    }).finally(() => setLoading(false));
  }, [taskId]);

  const handleGetOptions = async () => {
    if (!taskId || !question.trim()) return;
    setGenerating(true);
    setOptions([]);
    setChosen(null);
    setSaved(false);
    try {
      const res = await api.decisions.create(taskId, question.trim());
      setCurrentDecisionId(res.id);
      setOptions(res.options);
    } catch {
      setOptions([
        { label: 'Option A', description: 'Conservative approach — lower risk' },
        { label: 'Option B', description: 'Balanced approach — moderate risk' },
        { label: 'Option C', description: 'Bold approach — higher risk' },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const handleChoose = async (idx: number) => {
    setChosen(idx);
    if (currentDecisionId) {
      await api.decisions.choose(currentDecisionId, idx);
    }
    setSaved(true);
    if (taskId) {
      const decisions = await api.decisions.list(taskId);
      setPastDecisions(decisions);
    }
  };

  if (loading) return <div className="screen-loading">Loading…</div>;

  if (saved) {
    return (
      <div className="screen decision-screen">
        <div className="task-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Decision saved.</h2>
          <p style={{ color: 'var(--muted)', margin: '1rem 0' }}>Back to your task.</p>
          <div className="task-actions" style={{ justifyContent: 'center' }}>
            <button onClick={() => navigate(`/guided/${taskId}`)}>Back to Task</button>
            <button onClick={() => { setSaved(false); setOptions([]); setQuestion(''); setCurrentDecisionId(null); }}>
              Another Decision
            </button>
          </div>
        </div>

        {pastDecisions.length > 0 && (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Past Decisions</h2>
            {pastDecisions.map((d) => (
              <div key={d.id} className="task-card" style={{ opacity: 0.85 }}>
                <p style={{ fontWeight: 500, margin: '0 0 0.5rem' }}>{d.question}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {d.options.map((o, i) => (
                    <div
                      key={i}
                      style={{
                        flex: '1 1 0',
                        minWidth: '140px',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: d.chosenOption === i ? '2px solid var(--skafold-blue-700)' : '1px solid var(--border)',
                        background: d.chosenOption === i ? 'var(--skafold-blue-50)' : 'var(--skafold-white)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong>{o.label}</strong>
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>{o.description}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>
                  {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="screen decision-screen">
      <h1>Decision Helper</h1>
      {taskTitle && <p className="subtitle">Task: {taskTitle}</p>}

      <section className="task-card">
        <label htmlFor="decision-q" style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
          What decision are you stuck on?
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="decision-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Should I hire a contractor or do it myself?"
            style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGetOptions(); }}
          />
          <button
            onClick={handleGetOptions}
            disabled={generating || !question.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--skafold-blue-700)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating || !question.trim() ? 0.6 : 1,
            }}
          >
            {generating ? 'Thinking…' : 'Get Options'}
          </button>
        </div>
      </section>

      {options.length > 0 && (
        <section style={{ margin: '1.5rem 0' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Your Options</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleChoose(i)}
                style={{
                  flex: '1 1 0',
                  minWidth: '180px',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: chosen === i ? '2px solid var(--skafold-blue-700)' : '1px solid var(--border)',
                  background: chosen === i ? 'var(--skafold-blue-50)' : 'var(--skafold-white)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{opt.label}</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{opt.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {pastDecisions.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Past Decisions</h2>
          {pastDecisions.map((d) => (
            <div key={d.id} className="task-card" style={{ opacity: 0.85 }}>
              <p style={{ fontWeight: 500, margin: '0 0 0.5rem' }}>{d.question}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {d.options.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      flex: '1 1 0',
                      minWidth: '140px',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: d.chosenOption === i ? '2px solid var(--skafold-blue-700)' : '1px solid var(--border)',
                      background: d.chosenOption === i ? 'var(--skafold-blue-50)' : 'var(--skafold-white)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <strong>{o.label}</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>{o.description}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>
                {new Date(d.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </section>
      )}

      <div className="task-actions" style={{ marginTop: '1.5rem' }}>
        <button onClick={() => navigate(`/guided/${taskId}`)}>Back to Task</button>
      </div>
    </div>
  );
}
