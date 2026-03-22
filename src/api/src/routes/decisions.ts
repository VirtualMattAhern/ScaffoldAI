import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { generateDecisionOptions } from '../services/ai.js';
import { logError, requestLogContext } from '../observability/logger.js';

export const decisionsRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

decisionsRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const taskId = req.query.taskId as string;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  const db = await getDb();
  const rows = await db.all<{ id: string; question: string; options: string; chosen_option: number | null; created_at: string }>(
    'SELECT id, question, options, chosen_option, created_at FROM decisions WHERE user_id = ? AND task_id = ? ORDER BY created_at DESC',
    [userId, taskId]
  );
  res.json(rows.map(r => ({
    id: r.id,
    question: r.question,
    options: JSON.parse(r.options || '[]'),
    chosenOption: r.chosen_option,
    createdAt: r.created_at,
  })));
});

decisionsRouter.post('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { taskId, question } = req.body;
  if (!taskId || !question) return res.status(400).json({ error: 'taskId and question required' });

  const db = await getDb();
  const task = await db.get<{ title: string }>('SELECT title FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  try {
    const options = await generateDecisionOptions(task.title, question);
    const id = uuidv4();
    await db.run(
      'INSERT INTO decisions (id, user_id, task_id, question, options, chosen_option) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, taskId, question, JSON.stringify(options), -1]
    );
    res.status(201).json({ id, question, options });
  } catch (err) {
    logError('decisions.generate_failed', {
      ...requestLogContext(req),
      taskId,
    }, err);
    const fallbackOptions = [
      { label: 'Option A', description: 'Conservative approach — lower risk, steady progress' },
      { label: 'Option B', description: 'Balanced approach — moderate risk, good progress' },
      { label: 'Option C', description: 'Bold approach — higher risk, faster progress' },
    ];
    const id = uuidv4();
    await db.run(
      'INSERT INTO decisions (id, user_id, task_id, question, options, chosen_option) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, taskId, question, JSON.stringify(fallbackOptions), -1]
    );
    res.status(201).json({ id, question, options: fallbackOptions });
  }
});

decisionsRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const { chosenOption } = req.body;
  if (chosenOption === undefined || chosenOption < 0) return res.status(400).json({ error: 'chosenOption required (0-2)' });
  const db = await getDb();
  const result = await db.run('UPDATE decisions SET chosen_option = ? WHERE id = ? AND user_id = ?', [chosenOption, id, userId]);
  if (result.changes === 0) return res.status(404).json({ error: 'Decision not found' });
  res.json({ id, chosenOption });
});
