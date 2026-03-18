import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { suggestTop3 } from '../services/ai.js';

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
    timeboxMinutes: row.timebox_minutes,
    nextStep: row.next_step,
    top3Candidate: !!row.top3_candidate,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    pausedUntil: row.paused_until,
  };
}

tasksRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { status, type } = req.query;
  let sql = 'SELECT * FROM tasks WHERE user_id = ?';
  const params: (string | number)[] = [userId];
  if (status) { sql += ' AND status = ?'; params.push(status as string); }
  if (type) { sql += ' AND type = ?'; params.push(type as string); }
  sql += ' ORDER BY top3_candidate DESC, created_at ASC';
  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(sql, params);
  res.json(rows.map(mapTask));
});

tasksRouter.get('/top3', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const rows = await db.all<Record<string, unknown>>(`
    SELECT * FROM tasks WHERE user_id = ? AND status IN ('open', 'in_progress', 'paused')
    ORDER BY top3_candidate DESC, created_at ASC LIMIT 3
  `, [userId]);
  res.json(rows.map(mapTask));
});

tasksRouter.post('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { title, goalId, playbookId, type, timeboxMinutes, nextStep } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uuidv4();
  const db = await getDb();
  await db.run(`
    INSERT INTO tasks (id, user_id, goal_id, playbook_id, title, type, timebox_minutes, next_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, userId, goalId ?? null, playbookId ?? null, title, type ?? 'one_off', timeboxMinutes ?? null, nextStep ?? null]);
  const row = await db.get<Record<string, unknown>>('SELECT * FROM tasks WHERE id = ?', [id]);
  res.status(201).json(mapTask(row!));
});

tasksRouter.post('/ai-suggest-top3', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();

  const rows = await db.all<{ id: string; title: string; status: string; type: string; created_at: string }>(`
    SELECT id, title, status, type, created_at FROM tasks
    WHERE user_id = ? AND status = 'open'
    ORDER BY created_at ASC
  `, [userId]);

  try {
    const { taskIds, explanation } = await suggestTop3(rows.map((r) => ({ ...r, createdAt: r.created_at })));

    await db.run('UPDATE tasks SET top3_candidate = 0 WHERE user_id = ?', [userId]);
    for (const id of taskIds) {
      await db.run('UPDATE tasks SET top3_candidate = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    }

    res.json({ taskIds, explanation });
  } catch (err) {
    console.error('AI suggest top3 error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI suggestion failed',
    });
  }
});

tasksRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const { status, nextStep, top3Candidate, pausedUntil } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];
  if (status !== undefined) { updates.push('status = ?'); values.push(status); if (status === 'done') { updates.push('completed_at = ?'); values.push(new Date().toISOString()); } }
  if (nextStep !== undefined) { updates.push('next_step = ?'); values.push(nextStep); }
  if (top3Candidate !== undefined) { updates.push('top3_candidate = ?'); values.push(top3Candidate ? 1 : 0); }
  if (pausedUntil !== undefined) { updates.push('paused_until = ?'); values.push(pausedUntil); }
  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
  values.push(id, userId);
  const db = await getDb();
  const result = await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ id });
});
