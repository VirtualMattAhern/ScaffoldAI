import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import './Screen.css';

type Task = {
  id: string;
  title: string;
  status: string;
  type: string;
  goalId?: string | null;
  dependencyTaskId?: string | null;
  dependencyStatus?: string | null;
  recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null;
  plannedFor?: string | null;
  top3Candidate: boolean;
  top3Rank?: number | null;
  colorHex?: string | null;
  createdAt: string;
};

type Goal = {
  id: string;
  title: string;
  colorHex?: string | null;
  createdAt: string;
};

type WeeklyReview = {
  summary: string;
  stats: { completed: number; started: number; paused: number; top3Count: number; playbooksUsed: number };
};

const TASK_COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6', '#f43f5e', '#84cc16'];
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function WeeklyPlanning() {
  const [brainDump, setBrainDump] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('open');
  const [editGoalId, setEditGoalId] = useState<string>('');
  const [editDependencyTaskId, setEditDependencyTaskId] = useState<string>('');
  const [editRecurrenceRule, setEditRecurrenceRule] = useState<string>('');
  const [editPlannedFor, setEditPlannedFor] = useState('');
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const [quickAddGoalId, setQuickAddGoalId] = useState('');
  const [quickAddDependencyTaskId, setQuickAddDependencyTaskId] = useState('');
  const [quickAddRecurrenceRule, setQuickAddRecurrenceRule] = useState('');
  const [quickAddPlannedFor, setQuickAddPlannedFor] = useState('');

  const loadTasks = () => {
    const params: { status?: string; type?: string } = {};
    if (filterStatus) params.status = filterStatus;
    if (filterType) params.type = filterType;
    return api.tasks.list(Object.keys(params).length ? params : undefined);
  };

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.top3Candidate !== b.top3Candidate) return Number(b.top3Candidate) - Number(a.top3Candidate);
        return (a.top3Rank ?? 999999) - (b.top3Rank ?? 999999) || a.createdAt.localeCompare(b.createdAt);
      }),
    [tasks],
  );

  const goalProgress = useMemo(() => {
    return goals.map((goal) => {
      const goalTasks = tasks.filter((task) => task.goalId === goal.id);
      const completed = goalTasks.filter((task) => task.status === 'done').length;
      const total = goalTasks.length;
      return {
        ...goal,
        total,
        completed,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    }).filter((goal) => goal.total > 0);
  }, [goals, tasks]);

  const weekDays = useMemo(() => {
    const start = getWeekStart();
    return WEEKDAY_LABELS.map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        label,
        key: formatDateInput(date),
        dayNumber: date.getDate(),
        isToday: formatDateInput(date) === formatDateInput(new Date()),
      };
    });
  }, []);

  const weeklyCalendar = useMemo(
    () =>
      weekDays.map((day) => ({
        ...day,
        tasks: sortedTasks.filter((task) => task.plannedFor === day.key && task.status !== 'done'),
      })),
    [sortedTasks, weekDays],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([api.brainDump.get(), loadTasks(), api.goals.list()]).then(([dump, taskList, goalList]) => {
      setBrainDump(dump.rawText);
      setTasks(taskList);
      setGoals(goalList);
    }).finally(() => setLoading(false));
  }, [filterStatus, filterType]);

  useEffect(() => {
    const refresh = () => {
      loadTasks().then(setTasks).catch(() => {});
    };
    window.addEventListener('skafold:task-created', refresh);
    return () => window.removeEventListener('skafold:task-created', refresh);
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
      const task = await api.tasks.create({
        title,
        goalId: quickAddGoalId || undefined,
        type: quickAddRecurrenceRule ? 'repeat' : 'one_off',
        dependencyTaskId: quickAddDependencyTaskId || undefined,
        recurrenceRule: (quickAddRecurrenceRule || undefined) as 'daily' | 'weekly' | 'monthly' | undefined,
        plannedFor: quickAddPlannedFor || undefined,
      }) as Task;
      setTasks((prev) => [...prev, task]);
      setQuickAddGoalId('');
      setQuickAddDependencyTaskId('');
      setQuickAddRecurrenceRule('');
      setQuickAddPlannedFor('');
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Failed to add task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskStatus(task.status);
    setEditGoalId(task.goalId ?? '');
    setEditDependencyTaskId(task.dependencyTaskId ?? '');
    setEditRecurrenceRule(task.recurrenceRule ?? '');
    setEditPlannedFor(task.plannedFor ?? '');
  };

  const handleSaveTaskEdit = async (taskId: string) => {
    try {
      await api.tasks.update(taskId, {
        title: editTaskTitle.trim(),
        status: editTaskStatus,
        goalId: editGoalId || null,
        dependencyTaskId: editDependencyTaskId || null,
        recurrenceRule: (editRecurrenceRule || null) as 'daily' | 'weekly' | 'monthly' | null,
        plannedFor: editPlannedFor || null,
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: editTaskTitle.trim(),
                status: editTaskStatus,
                goalId: editGoalId || null,
                dependencyTaskId: editDependencyTaskId || null,
                recurrenceRule: (editRecurrenceRule || null) as 'daily' | 'weekly' | 'monthly' | null,
                plannedFor: editPlannedFor || null,
              }
            : task,
        ),
      );
      setEditingTaskId(null);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleColorChange = async (taskId: string, colorHex: string | null) => {
    try {
      await api.tasks.update(taskId, { colorHex });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, colorHex } : task)));
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Failed to save color');
    }
  };

  const handleGenerateReview = async () => {
    setReviewing(true);
    try {
      const result = await api.tasks.weeklyReview();
      setReview(result);
    } catch (err) {
      setHelperMessage(err instanceof Error ? err.message : 'Weekly review failed');
    } finally {
      setReviewing(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognitionClass = (
      window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    ).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setHelperMessage('Voice input is not supported in this browser.');
      return;
    }

    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      setBrainDump(transcript);
    };
    recognition.onerror = () => {
      setRecording(false);
      setHelperMessage('Voice input ran into a problem. You can still type your brain dump.');
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.tasks.update(id, { status: 'done' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (status: 'done' | 'paused') => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await api.tasks.update(id, { status });
    }
    setTasks((prev) =>
      status === 'done' ? prev.filter((t) => !selectedIds.has(t.id)) : prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: 'paused' } : t))
    );
    setSelectedIds(new Set());
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
          <button type="button" onClick={handleVoiceInput} style={{ marginLeft: '0.5rem' }}>
            {recording ? 'Stop voice input' : 'Voice input'}
          </button>
        </div>
      </section>

      <p className="flow-hint">AI organizes goals + tasks for the week ↓</p>

      {goalProgress.length > 0 && (
        <section className="helper">
          <h2>Goal progress</h2>
          <p className="subtitle">A quick view of which weekly goals are moving and which still need attention.</p>
          <div className="goal-progress-grid">
            {goalProgress.map((goal) => (
              <div key={goal.id} className="goal-progress-card">
                <div className="goal-progress-head">
                  <span className="task-color-dot" style={{ background: goal.colorHex || 'var(--skafold-blue-500)', borderColor: goal.colorHex || 'var(--skafold-blue-500)' }} />
                  <strong>{goal.title}</strong>
                  <span>{goal.completed}/{goal.total}</span>
                </div>
                <div className="goal-progress-track" aria-hidden="true">
                  <div className="goal-progress-fill" style={{ width: `${goal.percent}%`, background: goal.colorHex || 'var(--skafold-blue-500)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="helper">
        <h2>Weekly calendar</h2>
        <p className="subtitle">Give tasks a planned day to turn the week into a calmer visual schedule.</p>
        <div className="weekly-calendar-grid">
          {weeklyCalendar.map((day) => (
            <div key={day.key} className={`weekly-day-card ${day.isToday ? 'is-today' : ''}`}>
              <div className="weekly-day-head">
                <strong>{day.label}</strong>
                <span>{day.dayNumber}</span>
              </div>
              {day.tasks.length === 0 ? (
                <p className="weekly-day-empty">No planned tasks</p>
              ) : (
                <div className="weekly-day-list">
                  {day.tasks.map((task) => (
                    <div key={task.id} className="weekly-day-task">
                      <span className="task-color-dot" style={{ background: task.colorHex || 'transparent', borderColor: task.colorHex || 'var(--border)' }} />
                      <span>{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="task-list">
        <h2>Weekly Task List</h2>
        <p className="subtitle">Filter by status or type — open items sorted to top</p>

        {selectedIds.size > 0 && (
          <div className="bulk-actions" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>{selectedIds.size} selected</span>
            <button onClick={() => handleBulkAction('done')}>Mark Done</button>
            <button onClick={() => handleBulkAction('paused')}>Mark Paused</button>
            <button onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        )}
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
                <th>Select</th>
                <th>Task</th>
                <th>Status</th>
                <th>Top 3</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((t) => (
                <tr key={t.id} className={`${t.status === 'done' ? 'task-done' : ''} ${selectedIds.has(t.id) ? 'selected' : ''}`}>
                  <td>
                    {t.status !== 'done' && (
                      <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label={`Select ${t.title}`} />
                    )}
                  </td>
                  <td>
                    <div className="task-row-main">
                      <span className="task-color-dot" style={{ background: t.colorHex || 'transparent', borderColor: t.colorHex ? t.colorHex : 'var(--border)' }} />
                      {editingTaskId === t.id ? (
                        <div className="inline-task-stack">
                          <input
                            value={editTaskTitle}
                            onChange={(e) => setEditTaskTitle(e.target.value)}
                            className="inline-task-input"
                          />
                          <div className="inline-task-meta-row">
                            <select value={editGoalId} onChange={(e) => setEditGoalId(e.target.value)} className="inline-task-select">
                              <option value="">No goal</option>
                              {goals.map((goal) => (
                                <option key={goal.id} value={goal.id}>{goal.title}</option>
                              ))}
                            </select>
                            <select value={editDependencyTaskId} onChange={(e) => setEditDependencyTaskId(e.target.value)} className="inline-task-select">
                              <option value="">No dependency</option>
                              {sortedTasks.filter((task) => task.id !== t.id).map((task) => (
                                <option key={task.id} value={task.id}>{task.title}</option>
                              ))}
                            </select>
                            <select value={editRecurrenceRule} onChange={(e) => setEditRecurrenceRule(e.target.value)} className="inline-task-select">
                              <option value="">One-off</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                            <input type="date" value={editPlannedFor} onChange={(e) => setEditPlannedFor(e.target.value)} className="inline-task-input" />
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="inline-task-trigger" onClick={() => handleEditTask(t)}>
                          {t.title}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    {editingTaskId === t.id ? (
                      <select value={editTaskStatus} onChange={(e) => setEditTaskStatus(e.target.value)} className="inline-task-select">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="paused">Paused</option>
                        <option value="done">Done</option>
                      </select>
                    ) : (
                      <span className={`status-badge status-${t.status}`} title={`Status: ${t.status.replace('_', ' ')}`}>{t.status.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td title={t.top3Candidate ? 'Marked as Top 3 for today' : 'Not in Top 3'}>{t.top3Candidate ? '★' : ''}</td>
                  <td title={`Task type: ${t.type.replace('_', ' ')}`}>{t.type.replace('_', ' ')}</td>
                  <td>
                    <div className="task-row-actions">
                      {t.goalId && (
                        <span className="task-inline-pill" title="Linked to a goal">
                          {goals.find((goal) => goal.id === t.goalId)?.title ?? 'Goal linked'}
                        </span>
                      )}
                      {t.dependencyTaskId && (
                        <span className="task-inline-pill" title={`Blocked until dependency is done${t.dependencyStatus ? ` (${t.dependencyStatus})` : ''}`}>
                          Depends on task
                        </span>
                      )}
                      {t.recurrenceRule && (
                        <span className="task-inline-pill" title="Recurring task">
                          Repeats {t.recurrenceRule}
                        </span>
                      )}
                      {t.plannedFor && (
                        <span className="task-inline-pill" title="Planned day">
                          Planned {t.plannedFor}
                        </span>
                      )}
                      <select
                        aria-label={`Color for ${t.title}`}
                        value={t.colorHex ?? ''}
                        onChange={(e) => handleColorChange(t.id, e.target.value || null)}
                        className="inline-task-select"
                      >
                        <option value="">No color</option>
                        {TASK_COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      {editingTaskId === t.id ? (
                        <>
                          <button type="button" onClick={() => handleSaveTaskEdit(t.id)}>Save</button>
                          <button type="button" onClick={() => setEditingTaskId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => handleEditTask(t)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDeleteTask(t.id)} title="Delete">×</button>
                    </div>
                  </td>
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
            <select value={quickAddGoalId} onChange={(e) => setQuickAddGoalId(e.target.value)} className="inline-task-select">
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
            <select value={quickAddDependencyTaskId} onChange={(e) => setQuickAddDependencyTaskId(e.target.value)} className="inline-task-select">
              <option value="">No dependency</option>
              {sortedTasks.map((task) => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
            <select value={quickAddRecurrenceRule} onChange={(e) => setQuickAddRecurrenceRule(e.target.value)} className="inline-task-select">
              <option value="">One-off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input type="date" value={quickAddPlannedFor} onChange={(e) => setQuickAddPlannedFor(e.target.value)} className="inline-task-input" />
            <button onClick={handleQuickAdd} disabled={!quickAdd.trim()}>Add</button>
          </div>
          <button onClick={handleSuggestTop3} disabled={suggesting || tasks.length === 0}>
            {suggesting ? 'Suggesting…' : 'AI Suggest Top 3'}
          </button>
        </div>
      </section>

      <section className="helper">
        <h3>This week’s wins</h3>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button type="button" onClick={handleGenerateReview} disabled={reviewing}>
            {reviewing ? 'Reviewing…' : 'Generate weekly review'}
          </button>
        </div>
        {review && (
          <div className="weekly-review-card">
            <p>{review.summary}</p>
            <div className="weekly-review-stats">
              <span>Completed: {review.stats.completed}</span>
              <span>Started: {review.stats.started}</span>
              <span>Paused: {review.stats.paused}</span>
              <span>Top 3 picks: {review.stats.top3Count}</span>
              <span>Playbooks used: {review.stats.playbooksUsed}</span>
            </div>
          </div>
        )}
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
