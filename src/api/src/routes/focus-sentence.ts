import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { suggestFocusSentence } from '../services/ai.js';

export const focusSentenceRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

focusSentenceRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const date = (req.query.date as string) || getToday();
  const db = await getDb();
  const row = await db.get<{ sentence: string }>('SELECT sentence FROM focus_sentences WHERE user_id = ? AND date = ?', [userId, date]);
  res.json({ sentence: row?.sentence ?? '' });
});

focusSentenceRouter.put('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { sentence } = req.body;
  const date = getToday();
  const db = await getDb();
  const existing = await db.get<{ id: string }>('SELECT id FROM focus_sentences WHERE user_id = ? AND date = ?', [userId, date]);
  if (existing) {
    await db.run('UPDATE focus_sentences SET sentence = ? WHERE user_id = ? AND date = ?', [sentence ?? '', userId, date]);
    res.json({ sentence: sentence ?? '', date });
  } else {
    const id = uuidv4();
    await db.run('INSERT INTO focus_sentences (id, user_id, sentence, date) VALUES (?, ?, ?, ?)', [id, userId, sentence ?? '', date]);
    res.status(201).json({ sentence: sentence ?? '', date });
  }
});

focusSentenceRouter.post('/suggest', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const date = getToday();
  const db = await getDb();

  const tasks = await db.all<{ title: string }>(`
    SELECT title FROM tasks
    WHERE user_id = ? AND status IN ('open', 'in_progress', 'paused')
    ORDER BY top3_candidate DESC, created_at ASC
    LIMIT 3
  `, [userId]);

  const taskTitles = tasks.map((t) => t.title);

  try {
    const sentence = await suggestFocusSentence(taskTitles);

    const existing = await db.get<{ id: string }>('SELECT id FROM focus_sentences WHERE user_id = ? AND date = ?', [userId, date]);
    if (existing) {
      await db.run('UPDATE focus_sentences SET sentence = ? WHERE user_id = ? AND date = ?', [sentence, userId, date]);
    } else {
      const id = uuidv4();
      await db.run('INSERT INTO focus_sentences (id, user_id, sentence, date) VALUES (?, ?, ?, ?)', [id, userId, sentence, date]);
    }

    res.json({ sentence });
  } catch (err) {
    console.error('Focus sentence suggest error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI suggestion failed',
      sentence: "Today is for: moving the business forward without overload",
    });
  }
});
