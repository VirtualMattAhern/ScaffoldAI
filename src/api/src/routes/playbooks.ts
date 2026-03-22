import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { refinePlaybookWithAi, suggestPlaybooksFromTasks } from '../services/ai.js';
import { logError, requestLogContext } from '../observability/logger.js';

export const playbooksRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

playbooksRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const rows = await db.all<{ id: string; title: string; type: string; steps: string; last_used_at: string | null; suggested_by_ai: number; created_at: string }>('SELECT * FROM playbooks WHERE user_id = ? ORDER BY last_used_at DESC, created_at DESC', [userId]);
  res.json(rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    steps: JSON.parse(row.steps || '[]'),
    lastUsedAt: row.last_used_at,
    suggestedByAi: !!row.suggested_by_ai,
    createdAt: row.created_at,
  })));
});

playbooksRouter.post('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { title, type, steps, suggestedByAi } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title and type required' });
  const id = uuidv4();
  const stepsJson = JSON.stringify(steps ?? []);
  const db = await getDb();
  await db.run(
    'INSERT INTO playbooks (id, user_id, title, type, steps, suggested_by_ai) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, title, type, stepsJson, suggestedByAi ? 1 : 0]
  );
  res.status(201).json({ id, title, type, steps: steps ?? [], suggestedByAi: !!suggestedByAi, createdAt: new Date().toISOString() });
});

playbooksRouter.post('/ai-suggest', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const rows = await db.all<{ id: string; title: string; type: string; completed_at: string | null }>(
    `SELECT id, title, type, completed_at FROM tasks WHERE user_id = ? AND status = 'done' ORDER BY completed_at ASC`,
    [userId]
  );
  try {
    const { playbooks, explanation } = await suggestPlaybooksFromTasks(rows.map((r) => ({ ...r, completedAt: r.completed_at })));
    res.json({ playbooks, explanation });
  } catch (err) {
    logError('playbooks.ai_suggest_failed', requestLogContext(req), err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI suggestion failed',
      requestId: req.requestId,
    });
  }
});

playbooksRouter.post('/:id/ai-refine', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const db = await getDb();

  const playbook = await db.get<{ id: string; title: string; steps: string }>(
    'SELECT id, title, steps FROM playbooks WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  if (!playbook) return res.status(404).json({ error: 'Playbook not found' });

  const relatedTasks = await db.all<{ title: string }>(
    `SELECT title FROM tasks
     WHERE user_id = ? AND playbook_id = ? AND completed_at IS NOT NULL
     ORDER BY completed_at DESC LIMIT 10`,
    [userId, id],
  );

  try {
    const result = await refinePlaybookWithAi({
      title: playbook.title,
      steps: JSON.parse(playbook.steps || '[]'),
      relatedTasks: relatedTasks.map((task) => task.title),
    });
    res.json(result);
  } catch (err) {
    logError('playbooks.ai_refine_failed', {
      ...requestLogContext(req),
      playbookId: id,
    }, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI refinement failed',
      requestId: req.requestId,
    });
  }
});

playbooksRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const { title, type, steps, lastUsedAt } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (type !== undefined) { updates.push('type = ?'); values.push(type); }
  if (steps !== undefined) { updates.push('steps = ?'); values.push(JSON.stringify(steps)); }
  if (lastUsedAt !== undefined) { updates.push('last_used_at = ?'); values.push(lastUsedAt); }
  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
  values.push(id, userId);
  const db = await getDb();
  const result = await db.run(`UPDATE playbooks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
  if (result.changes === 0) return res.status(404).json({ error: 'Playbook not found' });
  res.json({ id });
});
