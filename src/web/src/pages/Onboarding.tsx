import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { ONBOARDING_DONE_KEY } from './Landing';
import './Screen.css';
import './Onboarding.css';

const PERSONAS = {
  builder: {
    label: 'Builder / founder',
    description: 'You are juggling ideas, admin, and execution at the same time.',
    playbookTitle: 'Founder weekly reset',
    playbookSteps: ['Clear the mental pile', 'Pick the highest-leverage work', 'Protect time for follow-through'],
    brainDumpPlaceholder: 'e.g., Reply to leads, fix signup flow, review finances, plan launch post',
  },
  creative: {
    label: 'Creative / maker',
    description: 'You need enough structure to ship without flattening the creative work.',
    playbookTitle: 'Creative focus reset',
    playbookSteps: ['Capture open loops', 'Choose one piece to finish', 'Set up the next creation block'],
    brainDumpPlaceholder: 'e.g., Finish draft, edit reel, send invoice, prep client revisions',
  },
  operator: {
    label: 'Operator / manager',
    description: 'You are holding people, processes, and follow-through together.',
    playbookTitle: 'Operations weekly anchor',
    playbookSteps: ['Review commitments', 'Surface blockers', 'Sequence the week into manageable chunks'],
    brainDumpPlaceholder: 'e.g., Update team notes, reply to stakeholders, review timeline, unblock approvals',
  },
  overwhelmed: {
    label: 'Overloaded / catching up',
    description: 'You need the app to reduce noise fast and help you find your next foothold.',
    playbookTitle: 'Calm catch-up reset',
    playbookSteps: ['Brain dump everything', 'Circle the must-do items', 'Shrink today to one doable starting point'],
    brainDumpPlaceholder: 'e.g., Too many tabs open, inbox backlog, missed follow-ups, need one starting point',
  },
} as const;

type PersonaKey = keyof typeof PERSONAS;

const STEPS = [
  { title: 'Welcome to SkafoldAI', body: 'SkafoldAI helps you move from ideas to plans to focused action—without holding everything in your head at once.' },
  { title: 'What kind of support fits you best?', body: 'Choose the starting style that feels closest. This just tailors the first setup and can evolve later.', input: 'persona' },
  { title: 'What kind of work do you do?', body: 'This helps us suggest relevant playbooks. You can change this later.', input: 'businessType', placeholder: 'e.g., Small retail, consulting, creative studio' },
  { title: 'Your first playbook', body: 'We\'ve created a starter playbook based on your work. You can edit it anytime in Monthly — Playbooks.', input: null },
  { title: 'Try a brain dump', body: 'Type a few things on your mind for this week. AI will turn them into tasks.', input: 'brainDump', placeholder: 'e.g., Order inventory, reply to customer, plan event' },
  { title: "You're all set", body: 'Head to Daily — Rule of 3 to see your top tasks, or explore Weekly and Monthly when you\'re ready.' },
];

export function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<PersonaKey>('builder');
  const [businessType, setBusinessType] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const personaConfig = PERSONAS[persona];

  const handleNext = async () => {
    if (step === 2 && businessType) {
      // Create starter playbook
      setLoading(true);
      await api.playbooks.create({
        title: personaConfig.playbookTitle,
        type: 'repeat',
        steps: [...personaConfig.playbookSteps],
      });
      setLoading(false);
    }
    if (step === 4 && brainDump) {
      setLoading(true);
      await api.brainDump.save(brainDump);
      await api.brainDump.convert();
      setLoading(false);
    }
    if (isLast && user) {
      localStorage.setItem(ONBOARDING_DONE_KEY(user.id), 'true');
      localStorage.setItem(personaStorageKey(user.id), persona);
      navigate('/daily');
      return;
    }
    setStep((s) => s + 1);
  };

  const canProceed = () => {
    if (current.input === 'persona') return !!persona;
    if (current.input === 'businessType') return businessType.trim().length > 0;
    return true;
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        {current.input === 'persona' && (
          <div className="persona-grid">
            {(Object.entries(PERSONAS) as [PersonaKey, typeof PERSONAS[PersonaKey]][]).map(([key, option]) => (
              <button
                key={key}
                type="button"
                className={`persona-card ${persona === key ? 'active' : ''}`}
                onClick={() => setPersona(key)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        )}
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
            placeholder={personaConfig.brainDumpPlaceholder || current.placeholder}
            rows={4}
          />
        )}
        {step === 3 && (
          <div className="onboarding-note">
            <strong>{personaConfig.playbookTitle}</strong>
            <span>{personaConfig.description}</span>
          </div>
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

function personaStorageKey(userId: string) {
  return `skafoldai_persona_${userId}`;
}
