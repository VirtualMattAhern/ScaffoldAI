import { Router, Request } from 'express';
import { getDb } from '../db/client.js';
import { generateSubSteps, taskChat } from '../services/ai.js';
import { logError, requestLogContext } from '../observability/logger.js';

export const guidedRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

guidedRouter.post('/:taskId/chat', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { taskId } = req.params;
  const { message, history } = req.body as { message: string; history?: { role: 'user' | 'assistant'; content: string }[] };
  const db = await getDb();
  const task = await db.get<{ title: string }>('SELECT title FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  if (!task || !message?.trim()) return res.status(400).json({ error: 'Task not found or message required' });

  try {
    const reply = await taskChat(task.title, message.trim(), history ?? []);
    res.json({ reply });
  } catch (err) {
    logError('guided.task_chat_failed', {
      ...requestLogContext(req),
      taskId,
    }, err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Chat failed', requestId: req.requestId });
  }
});

guidedRouter.get('/:taskId/substeps', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { taskId } = req.params;
  const db = await getDb();
  const task = await db.get<{ id: string; title: string }>('SELECT id, title FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  try {
    const steps = await generateSubSteps(task.title);
    res.json({ steps });
  } catch (err) {
    logError('guided.substeps_failed', {
      ...requestLogContext(req),
      taskId,
    }, err);
    res.json({ steps: ['Start working on this task', 'Focus on the most important part first', 'Wrap up and review'] });
  }
});
