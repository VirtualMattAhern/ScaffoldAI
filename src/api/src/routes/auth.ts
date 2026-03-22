import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client.js';
import { createSessionToken } from '../auth/session.js';

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
    const user = {
      id: existing.id,
      email: existing.email,
      displayName: existing.display_name ?? existing.email.split('@')[0],
    };
    return res.json({
      user,
      token: createSessionToken({ userId: user.id, email: user.email, displayName: user.displayName }),
      emailVerification: {
        status: 'not_configured',
        required: false,
      },
    });
  }

  const id = uuidv4();
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : trimmed.split('@')[0];
  await db.run('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)', [id, trimmed, name]);
  const user = { id, email: trimmed, displayName: name };
  res.status(201).json({
    user,
    token: createSessionToken({ userId: user.id, email: user.email, displayName: user.displayName }),
    emailVerification: {
      status: 'not_configured',
      required: false,
    },
  });
});

authRouter.post('/legacy-session', async (req, res) => {
  const legacyUserId = req.headers['x-user-id'];
  if (typeof legacyUserId !== 'string' || !legacyUserId.trim()) {
    return res.status(400).json({ error: 'Legacy user id required' });
  }

  const db = await getDb();
  const row = await db.get<{ id: string; email: string; display_name: string | null }>(
    'SELECT id, email, display_name FROM users WHERE id = ?',
    [legacyUserId.trim()],
  );

  if (!row) return res.status(404).json({ error: 'User not found' });

  const user = {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? row.email.split('@')[0],
  };

  res.json({
    user,
    token: createSessionToken({ userId: user.id, email: user.email, displayName: user.displayName }),
    migratedFromLegacySession: true,
  });
});
