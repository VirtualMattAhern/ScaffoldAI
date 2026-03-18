import { useEffect, useState } from 'react';
import { api } from '../api/client';
import './Screen.css';

type Playbook = {
  id: string;
  title: string;
  type: string;
  steps: string[];
  lastUsedAt: string | null;
  suggestedByAi: boolean;
  createdAt: string;
};

export function MonthlyPlaybooks() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'repeat' | 'playbook'>('repeat');
  const [newSteps, setNewSteps] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; steps: string[] }[] | null>(null);
  const [suggestionExplanation, setSuggestionExplanation] = useState<string | null>(null);

  useEffect(() => {
    api.playbooks.list().then(setPlaybooks).finally(() => setLoading(false));
  }, []);

  const handleOpen = (id: string) => {
    const willExpand = expandedId !== id;
    setExpandedId(expandedId === id ? null : id);
    setEditingId(null);
    if (willExpand) {
      api.playbooks.update(id, { lastUsedAt: new Date().toISOString() }).catch(() => {});
    }
  };

  const handleEdit = (pb: Playbook) => {
    setEditingId(pb.id);
    setEditTitle(pb.title);
    setEditSteps(pb.steps.join('\n'));
    setExpandedId(pb.id);
  };

  const handleSaveEdit = async (id: string) => {
    const steps = editSteps.split('\n').map(s => s.trim()).filter(Boolean);
    await api.playbooks.update(id, { title: editTitle, steps });
    setPlaybooks((prev) => prev.map(pb => pb.id === id ? { ...pb, title: editTitle, steps } : pb));
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const steps = newSteps.split('\n').map(s => s.trim()).filter(Boolean);
    const pb = await api.playbooks.create({ title: newTitle.trim(), type: newType, steps }) as { id: string; title: string; type: string; steps: string[]; createdAt?: string };
    setPlaybooks((prev) => [{ ...pb, steps, lastUsedAt: null, suggestedByAi: false, createdAt: pb.createdAt ?? new Date().toISOString() } as Playbook, ...prev]);
    setNewTitle('');
    setNewSteps('');
    setShowCreate(false);
  };

  const handleAiSuggest = async () => {
    setSuggesting(true);
    setSuggestions(null);
    setSuggestionExplanation(null);
    try {
      const result = await api.playbooks.aiSuggest();
      setSuggestions(result.playbooks);
      setSuggestionExplanation(result.explanation);
    } catch (err) {
      setSuggestionExplanation(err instanceof Error ? err.message : 'Suggestion failed');
    } finally {
      setSuggesting(false);
    }
  };

  const handleCreateFromSuggestion = async (s: { title: string; steps: string[] }) => {
    const pb = await api.playbooks.create({ title: s.title, type: 'playbook', steps: s.steps, suggestedByAi: true }) as { id: string; title: string; type: string; steps: string[]; createdAt?: string };
    setPlaybooks((prev) => [{ ...pb, steps: s.steps, lastUsedAt: null, suggestedByAi: true, createdAt: pb.createdAt ?? new Date().toISOString() } as Playbook, ...prev]);
    setSuggestions((prev) => prev?.filter((x) => x.title !== s.title) ?? null);
  };

  if (loading) return <div className="screen-loading">Loading playbooks…</div>;

  return (
    <div className="screen">
      <h1>Monthly — Playbooks</h1>
      <p className="subtitle">Review / update recurring workflows. AI can suggest new playbooks from repeated task patterns.</p>

      <div className="actions-row" style={{ marginBottom: '1rem' }}>
        <button className="create-playbook-btn" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Playbook'}
        </button>
        <button
          className="create-playbook-btn"
          onClick={handleAiSuggest}
          disabled={suggesting}
          style={{ marginLeft: '0.5rem', background: 'var(--skafold-slate-600)' }}
        >
          {suggesting ? 'Analyzing…' : 'AI Suggest Playbooks'}
        </button>
      </div>

      {suggestionExplanation && (
        <div className="ai-suggestion" style={{ marginBottom: '1rem' }}>
          <p>{suggestionExplanation}</p>
          {suggestions && suggestions.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {suggestions.map((s, i) => (
                <div key={i} className="playbook-card" style={{ marginBottom: '0.5rem' }}>
                  <strong>{s.title}</strong>
                  <ol style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                    {s.steps.map((step, j) => <li key={j}>{step}</li>)}
                  </ol>
                  <button onClick={() => handleCreateFromSuggestion(s)}>Add as Playbook</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="playbook-card" style={{ marginTop: '1rem' }}>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Playbook title" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--skafold-slate-200)', borderRadius: 'var(--skafold-radius-sm)' }} />
          <select value={newType} onChange={e => setNewType(e.target.value as 'repeat' | 'playbook')} style={{ padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--skafold-slate-200)', borderRadius: 'var(--skafold-radius-sm)' }}>
            <option value="repeat">Repeat</option>
            <option value="playbook">Playbook</option>
          </select>
          <textarea value={newSteps} onChange={e => setNewSteps(e.target.value)} placeholder="Steps (one per line)" rows={3} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--skafold-slate-200)', borderRadius: 'var(--skafold-radius-sm)', fontFamily: 'inherit' }} />
          <button onClick={handleCreate} disabled={!newTitle.trim()}>Create</button>
        </div>
      )}

      {playbooks.length === 0 && !showCreate ? (
        <div className="empty-state">
          <p>No playbooks yet.</p>
          <p>Add one or let AI suggest from your tasks.</p>
        </div>
      ) : (
        <ul className="playbook-list">
          {playbooks.map((pb) => (
            <li key={pb.id} className="playbook-card">
              <div className="playbook-header">
                {editingId === pb.id ? (
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ flex: 1, padding: '0.35rem', border: '1px solid var(--skafold-slate-200)', borderRadius: 'var(--skafold-radius-sm)', fontWeight: 500 }} />
                ) : (
                  <h3>{pb.title}</h3>
                )}
                {pb.suggestedByAi && <span className="ai-badge">Suggested by AI</span>}
              </div>
              <p className="playbook-meta">Type: {pb.type} · Last used: {pb.lastUsedAt ? formatDate(pb.lastUsedAt) : 'Never'}</p>

              {expandedId === pb.id && (
                <div className="playbook-detail">
                  {editingId === pb.id ? (
                    <textarea value={editSteps} onChange={e => setEditSteps(e.target.value)} rows={4} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--skafold-slate-200)', borderRadius: 'var(--skafold-radius-sm)', fontFamily: 'inherit', marginBottom: '0.5rem' }} />
                  ) : (
                    pb.steps.length > 0 && (
                      <ol style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                        {pb.steps.map((step, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>)}
                      </ol>
                    )
                  )}
                </div>
              )}

              <div className="playbook-actions">
                <button onClick={() => handleOpen(pb.id)}>{expandedId === pb.id ? 'Close' : 'Open'}</button>
                {editingId === pb.id ? (
                  <button onClick={() => handleSaveEdit(pb.id)}>Save</button>
                ) : (
                  <button onClick={() => handleEdit(pb)}>Edit</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="helper">
        <h3>Your SkafoldAI Helper</h3>
        <p>Review your playbooks monthly. Edit steps that no longer work, and add new ones for tasks you keep repeating.</p>
      </section>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return '1 week ago';
  return d.toLocaleDateString();
}
