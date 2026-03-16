import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { ONBOARDING_DONE_KEY } from './Landing';
import './Screen.css';
import './Onboarding.css';

const STEPS = [
  { title: 'Welcome to SkafoldAI', body: 'SkafoldAI helps you move from ideas to plans to focused action—without holding everything in your head at once.' },
  { title: 'What kind of work do you do?', body: 'This helps us suggest relevant playbooks. You can change this later.', input: 'businessType', placeholder: 'e.g., Small retail, consulting, creative studio' },
  { title: 'Your first playbook', body: 'We\'ve created a starter playbook based on your work. You can edit it anytime in Monthly — Playbooks.', input: null },
  { title: 'Try a brain dump', body: 'Type a few things on your mind for this week. AI will turn them into tasks.', input: 'brainDump', placeholder: 'e.g., Order inventory, reply to customer, plan event' },
  { title: "You're all set", body: 'Head to Daily — Rule of 3 to see your top tasks, or explore Weekly and Monthly when you\'re ready.' },
];

export function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (step === 1 && businessType) {
      // Create starter playbook
      setLoading(true);
      await api.playbooks.create({
        title: 'Weekly Review',
        type: 'repeat',
        steps: ['Review last week', 'Plan priorities', 'Update task list'],
      });
      setLoading(false);
    }
    if (step === 3 && brainDump) {
      setLoading(true);
      await api.brainDump.save(brainDump);
      await api.brainDump.convert();
      setLoading(false);
    }
    if (isLast && user) {
      localStorage.setItem(ONBOARDING_DONE_KEY(user.id), 'true');
      navigate('/daily');
      return;
    }
    setStep((s) => s + 1);
  };

  const canProceed = () => {
    if (current.input === 'businessType') return businessType.trim().length > 0;
    return true;
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        {current.input === 'businessType' && (
          <input
            type="text"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder={current.placeholder}
            autoFocus
          />
        )}
        {current.input === 'brainDump' && (
          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder={current.placeholder}
            rows={4}
          />
        )}
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={i <= step ? 'active' : ''} />
          ))}
        </div>
        <button onClick={handleNext} disabled={!canProceed() || loading}>
          {loading ? 'Setting up…' : isLast ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
