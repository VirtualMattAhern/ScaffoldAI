import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';

export const goalsRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

goalsRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const goals = await db.all<{ id: string; title: string; created_at: string }>('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  res.json(goals.map(row => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  })));
});

goalsRouter.post('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uuidv4();
  const db = await getDb();
  await db.run('INSERT INTO goals (id, user_id, title) VALUES (?, ?, ?)', [id, userId, title]);
  res.status(201).json({ id, title, createdAt: new Date().toISOString() });
});

goalsRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const { title } = req.body;
  const db = await getDb();
  const result = await db.run('UPDATE goals SET title = ? WHERE id = ? AND user_id = ?', [title ?? '', id, userId]);
  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.json({ id, title });
});

goalsRouter.delete('/:id', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { id } = req.params;
  const db = await getDb();
  const result = await db.run('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]);
  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.status(204).send();
});
