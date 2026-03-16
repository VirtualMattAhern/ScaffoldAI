import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { convertBrainDump } from '../services/ai.js';

export const brainDumpRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

brainDumpRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const weekStart = (req.query.weekStart as string) || getWeekStart();
  const db = await getDb();
  const row = await db.get<{ id: string; raw_text: string; converted_at: string | null }>('SELECT * FROM brain_dumps WHERE user_id = ? AND week_start = ?', [userId, weekStart]);
  if (!row) return res.json({ rawText: '', convertedAt: null });
  res.json({ rawText: row.raw_text, convertedAt: row.converted_at });
});

brainDumpRouter.put('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { rawText } = req.body;
  const weekStart = getWeekStart();
  const db = await getDb();
  const existing = await db.get<{ id: string }>('SELECT id FROM brain_dumps WHERE user_id = ? AND week_start = ?', [userId, weekStart]);
  if (existing) {
    await db.run('UPDATE brain_dumps SET raw_text = ? WHERE user_id = ? AND week_start = ?', [rawText ?? '', userId, weekStart]);
    res.json({ rawText: rawText ?? '', weekStart });
  } else {
    const id = uuidv4();
    await db.run('INSERT INTO brain_dumps (id, user_id, raw_text, week_start) VALUES (?, ?, ?, ?)', [id, userId, rawText ?? '', weekStart]);
    res.status(201).json({ rawText: rawText ?? '', weekStart });
  }
});

brainDumpRouter.post('/convert', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const weekStart = getWeekStart();
  const db = await getDb();

  const row = await db.get<{ raw_text: string }>('SELECT * FROM brain_dumps WHERE user_id = ? AND week_start = ?', [userId, weekStart]);
  const rawText = row?.raw_text?.trim() ?? '';

  if (!rawText) {
    return res.status(400).json({ error: 'No brain dump text to convert. Add some ideas first.' });
  }

  try {
    const result = await convertBrainDump(rawText);

    const goalIdByTitle: Record<string, string> = {};
    for (const g of result.goals) {
      const id = uuidv4();
      await db.run('INSERT INTO goals (id, user_id, title) VALUES (?, ?, ?)', [id, userId, g.title]);
      goalIdByTitle[g.title] = id;
    }

    for (const t of result.tasks) {
      const id = uuidv4();
      const goalId = t.goal && goalIdByTitle[t.goal] ? goalIdByTitle[t.goal] : null;
      await db.run(`
        INSERT INTO tasks (id, user_id, goal_id, title, type)
        VALUES (?, ?, ?, ?, ?)
      `, [id, userId, goalId, t.title, t.type || 'one_off']);
    }

    const now = new Date().toISOString();
    await db.run('UPDATE brain_dumps SET converted_at = ? WHERE user_id = ? AND week_start = ?', [now, userId, weekStart]);

    res.json({
      message: 'Converted successfully',
      goalsCreated: result.goals.length,
      tasksCreated: result.tasks.length,
      explanation: result.explanation,
    });
  } catch (err) {
    console.error('Brain dump convert error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI conversion failed',
    });
  }
});
