import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { reprioritizeTop3, suggestTop3, suggestWeeklyReview } from '../services/ai.js';

export const tasksRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

function mapTask(row: Record<string, unknown>) {
  return {
    id: row.id,
    goalId: row.goal_id,
    playbookId: row.playbook_id,
    title: row.title,
    status: row.status,
    type: row.type,
    dependencyTaskId: row.dependency_task_id,
    dependencyStatus: row.dependency_status,
    recurrenceRule: row.recurrence_rule,
    timeboxMinutes: row.timebox_minutes,
    nextStep: row.next_step,
    top3Candidate: !!row.top3_candidate,
    top3Rank: row.top3_rank,
    colorHex: row.color_hex,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    pausedUntil: row.paused_until,
  };
}

function nextRecurringDate(rule: string | null | undefined) {
  const now = new Date();
  if (rule === 'daily') now.setDate(now.getDate() + 1);
  if (rule === 'weekly') now.setDate(now.getDate() + 7);
  if (rule === 'monthly') now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

tasksRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { status, type } = req.query;
  let sql = `
    SELECT t.*, dep.status AS dependency_status
    FROM tasks t
    LEFT JOIN tasks dep ON dep.id = t.dependency_task_id
    WHERE t.user_id = ?
  `;
  const params: (string | number)[] = [userId];
  if (status) { sql += ' AND t.status = ?'; params.push(status as string); }
  if (type) { sql += ' AND t.type = ?'; params.push(type as string); }
  sql += ' ORDER BY t.top3_candidate DESC, COALESCE(t.top3_rank, 999999) ASC, t.created_at ASC';
  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(sql, params);
  res.json(rows.map(mapTask));
});

tasksRouter.get('/top3', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(`
    SELECT t.*, dep.status AS dependency_status
    FROM tasks t
    LEFT JOIN tasks dep ON dep.id = t.dependency_task_id
    WHERE t.user_id = ?
      AND t.status IN ('open', 'in_progress', 'paused')
      AND (t.dependency_task_id IS NULL OR dep.status = 'done')
    ORDER BY t.top3_candidate DESC, COALESCE(t.top3_rank, 999999) ASC, t.created_at ASC LIMIT 3
  `, [userId]);
  res.json(rows.map(mapTask));
});

tasksRouter.post('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { title, goalId, playbookId, type, dependencyTaskId, recurrenceRule, timeboxMinutes, nextStep } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uuidv4();
  const db = await getDb();
  await db.run(`
    INSERT INTO tasks (id, user_id, goal_id, playbook_id, title, type, dependency_task_id, recurrence_rule, timebox_minutes, next_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, userId, goalId ?? null, playbookId ?? null, title, type ?? 'one_off', dependencyTaskId ?? null, recurrenceRule ?? null, timeboxMinutes ?? null, nextStep ?? null]);
  const row = await db.get<Record<string, unknown>>('SELECT * FROM tasks WHERE id = ?', [id]);
  res.status(201).json(mapTask(row!));
});

tasksRouter.post('/ai-suggest-top3', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();

  const rows = await db.all<{ id: string; title: string; status: string; type: string; created_at: string }>(`
    SELECT t.id, t.title, t.status, t.type, t.created_at
    FROM tasks t
    LEFT JOIN tasks dep ON dep.id = t.dependency_task_id
    WHERE t.user_id = ? AND t.status = 'open' AND (t.dependency_task_id IS NULL OR dep.status = 'done')
    ORDER BY t.created_at ASC
  `, [userId]);

  try {
    const { taskIds, explanation } = await suggestTop3(rows.map((r) => ({ ...r, createdAt: r.created_at })));

    await db.run('UPDATE tasks SET top3_candidate = 0, top3_rank = NULL WHERE user_id = ?', [userId]);
    for (const [index, id] of taskIds.entries()) {
      await db.run('UPDATE tasks SET top3_candidate = 1, top3_rank = ? WHERE id = ? AND user_id = ?', [index + 1, id, userId]);
    }

    res.json({ taskIds, explanation });
  } catch (err) {
    console.error('AI suggest top3 error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI suggestion failed',
    });
  }
});

tasksRouter.post('/ai-reprioritize-top3', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { trigger, taskId, lowEnergy } = req.body as { trigger?: 'paused' | 'not_today'; taskId?: string; lowEnergy?: boolean };
  if (!trigger || !taskId) return res.status(400).json({ error: 'trigger and taskId required' });

  const db = await getDb();
  const currentTop3 = await db.all<{ id: string; title: string; status: string; type: string; created_at: string }>(`
    SELECT id, title, status, type, created_at FROM tasks
    WHERE user_id = ? AND top3_candidate = 1 AND status IN ('open', 'in_progress', 'paused')
    ORDER BY COALESCE(top3_rank, 999999) ASC, created_at ASC
  `, [userId]);
  const candidateTasks = await db.all<{ id: string; title: string; status: string; type: string; created_at: string }>(`
    SELECT t.id, t.title, t.status, t.type, t.created_at
    FROM tasks t
    LEFT JOIN tasks dep ON dep.id = t.dependency_task_id
    WHERE t.user_id = ? AND t.status = 'open' AND (t.dependency_task_id IS NULL OR dep.status = 'done')
    ORDER BY t.created_at ASC
  `, [userId]);

  try {
    const { taskIds, explanation } = await reprioritizeTop3({
      trigger,
      lowEnergy,
      taskId,
      currentTop3: currentTop3.map((row) => ({ ...row, createdAt: row.created_at })),
      availableTasks: candidateTasks.map((row) => ({ ...row, createdAt: row.created_at })),
    });

    await db.run('UPDATE tasks SET top3_candidate = 0, top3_rank = NULL WHERE user_id = ?', [userId]);
    for (const [index, id] of taskIds.entries()) {
      await db.run('UPDATE tasks SET top3_candidate = 1, top3_rank = ? WHERE id = ? AND user_id = ?', [index + 1, id, userId]);
    }

    res.json({ taskIds, explanation });
  } catch (err) {
    console.error('AI reprioritize top3 error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI reprioritization failed',
    });
  }
});

tasksRouter.post('/weekly-review', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const db = await getDb();
  const tasks = await db.all<{ title: string; status: string; completed_at: string | null; created_at: string; top3_candidate: number; playbook_id: string | null }>(`
    SELECT title, status, completed_at, created_at, top3_candidate, playbook_id
    FROM tasks
    WHERE user_id = ?
  `, [userId]);

  const inThisWeek = (value: string | null) => value ? new Date(value) >= weekStart : false;
  const completed = tasks.filter((task) => inThisWeek(task.completed_at));
  const started = tasks.filter((task) => task.status === 'in_progress' || task.status === 'done').length;
  const paused = tasks.filter((task) => task.status === 'paused').length;
  const top3Count = tasks.filter((task) => task.top3_candidate).length;
  const playbooksUsed = new Set(tasks.filter((task) => task.playbook_id).map((task) => task.playbook_id)).size;

  try {
    const summary = await suggestWeeklyReview({
      completedTasks: completed.map((task) => task.title),
      startedCount: started,
      pausedCount: paused,
      top3Count,
      playbooksUsed,
    });

    res.json({
      summary,
      stats: {
        completed: completed.length,
        started,
        paused,
        top3Count,
        playbooksUsed,
      },
    });
  } catch (err) {
    console.error('Weekly review error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Weekly review failed',
    });
  }
});

tasksRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const { title, status, nextStep, top3Candidate, top3Rank, colorHex, dependencyTaskId, recurrenceRule, pausedUntil } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];
  const db = await getDb();
  const existing = await db.get<{ user_id: string; goal_id: string | null; playbook_id: string | null; title: string; type: string; dependency_task_id: string | null; recurrence_rule: string | null; timebox_minutes: number | null; next_step: string | null; color_hex: string | null }>(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); if (status === 'done') { updates.push('completed_at = ?'); values.push(new Date().toISOString()); } }
  if (nextStep !== undefined) { updates.push('next_step = ?'); values.push(nextStep); }
  if (top3Candidate !== undefined) {
    updates.push('top3_candidate = ?');
    values.push(top3Candidate ? 1 : 0);
    if (!top3Candidate && top3Rank === undefined) {
      updates.push('top3_rank = ?');
      values.push(null);
    }
  }
  if (top3Rank !== undefined) { updates.push('top3_rank = ?'); values.push(top3Rank); }
  if (colorHex !== undefined) { updates.push('color_hex = ?'); values.push(colorHex); }
  if (dependencyTaskId !== undefined) { updates.push('dependency_task_id = ?'); values.push(dependencyTaskId); }
  if (recurrenceRule !== undefined) { updates.push('recurrence_rule = ?'); values.push(recurrenceRule); }
  if (pausedUntil !== undefined) { updates.push('paused_until = ?'); values.push(pausedUntil); }
  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
  values.push(id, userId);
  const result = await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
  if (status === 'done' && existing.recurrence_rule) {
    const nextId = uuidv4();
    await db.run(
      `INSERT INTO tasks (id, user_id, goal_id, playbook_id, title, type, dependency_task_id, recurrence_rule, timebox_minutes, next_step, color_hex, paused_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        userId,
        existing.goal_id,
        existing.playbook_id,
        title ?? existing.title,
        existing.type,
        dependencyTaskId !== undefined ? dependencyTaskId : existing.dependency_task_id,
        recurrenceRule !== undefined ? recurrenceRule : existing.recurrence_rule,
        existing.timebox_minutes,
        nextStep !== undefined ? nextStep : existing.next_step,
        colorHex !== undefined ? colorHex : existing.color_hex,
        nextRecurringDate(recurrenceRule !== undefined ? recurrenceRule : existing.recurrence_rule),
      ],
    );
  }
  res.json({ id });
});
