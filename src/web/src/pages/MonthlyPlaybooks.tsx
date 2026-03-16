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

  useEffect(() => {
    api.playbooks.list().then(setPlaybooks).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="screen-loading">Loading playbooks…</div>;

  return (
    <div className="screen">
      <h1>Review / update recurring workflows</h1>
      <p className="subtitle">AI can suggest new playbooks from repeated task patterns.</p>

      {playbooks.length === 0 ? (
        <div className="empty-state">
          <p>No playbooks yet.</p>
          <p>Add one or let AI suggest from your tasks.</p>
        </div>
      ) : (
        <ul className="playbook-list">
          {playbooks.map((pb) => (
            <li key={pb.id} className="playbook-card">
              <div className="playbook-header">
                <h3>{pb.title}</h3>
                {pb.suggestedByAi && <span className="ai-badge">Suggested by AI</span>}
              </div>
              <p className="playbook-meta">Type: {pb.type} · Last used: {pb.lastUsedAt ? formatDate(pb.lastUsedAt) : 'Never'}</p>
              {pb.steps.length > 0 && (
                <p className="playbook-steps">Steps: {pb.steps.join(' → ')}</p>
              )}
              <div className="playbook-actions">
                <button>Open</button>
                <button>Edit</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="helper">
        <h3>Your SkafoldAI Helper</h3>
        <p>I found repeated patterns in your completed tasks and suggested playbooks you can reuse next month. This helps turn repeated work into a simpler routine so you do less re-planning.</p>
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
