import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';

export const authRouter = Router();

authRouter.get('/me', async (req: Request & { userId?: string }, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const db = await getDb();
  const row = await db.get<{ id: string; email: string; display_name: string | null }>('SELECT id, email, display_name FROM users WHERE id = ?', [userId]);
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? row.email.split('@')[0],
  });
});

authRouter.post('/login', async (req, res) => {
  const { email, displayName } = req.body as { email?: string; displayName?: string };
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' });
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return res.status(400).json({ error: 'email required' });

  const db = await getDb();
  const existing = await db.get<{ id: string; email: string; display_name: string | null }>('SELECT id, email, display_name FROM users WHERE email = ?', [trimmed]);

  if (existing) {
    return res.json({
      id: existing.id,
      email: existing.email,
      displayName: existing.display_name ?? existing.email.split('@')[0],
    });
  }

  const id = uuidv4();
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : trimmed.split('@')[0];
  await db.run('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)', [id, trimmed, name]);
  res.status(201).json({ id, email: trimmed, displayName: name });
});
