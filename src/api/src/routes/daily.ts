import { Router, Request } from 'express';
import { getDb } from '../db/client.js';
import { suggestDailyHelper } from '../services/ai.js';

export const dailyRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

dailyRouter.get('/helper', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const activeTaskId = req.query.activeTaskId as string | undefined;
  const lowEnergy = req.query.lowEnergy === 'true';
  const db = await getDb();

  const tasks = await db.all<{ id: string; title: string; status: string }>(`
    SELECT t.id, t.title, t.status FROM tasks t
    LEFT JOIN tasks dep ON dep.id = t.dependency_task_id
    WHERE t.user_id = ? AND t.status IN ('open', 'in_progress', 'paused')
      AND (t.dependency_task_id IS NULL OR dep.status = 'done')
    ORDER BY t.top3_candidate DESC, COALESCE(t.top3_rank, 999999) ASC, t.created_at ASC
    LIMIT 3
  `, [userId]);

  const taskTitles = tasks.map((t) => t.title);
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  try {
    const text = await suggestDailyHelper(taskTitles, activeTask?.title, lowEnergy);
    res.json({ text });
  } catch (err) {
    console.error('Daily helper error:', err);
    res.status(500).json({
      text: taskTitles.length > 0 ? 'Start with the first task.' : 'Add tasks in Weekly Planning.',
    });
  }
});
