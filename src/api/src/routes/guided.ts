import { Router, Request } from 'express';
import { getDb } from '../db/client.js';
import { generateSubSteps } from '../services/ai.js';

export const guidedRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

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
    console.error('Sub-steps generation error:', err);
    res.json({ steps: ['Start working on this task', 'Focus on the most important part first', 'Wrap up and review'] });
  }
});
