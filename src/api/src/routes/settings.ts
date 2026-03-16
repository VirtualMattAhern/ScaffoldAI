import { Router, Request } from 'express';
import { getDb } from '../db/client.js';
import { isAzureSql } from '../db/client.js';

export const settingsRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

settingsRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const row = await db.get<{ high_contrast: number; font_size_percent: number; dyslexia_font: number }>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  res.json({
    highContrast: row ? !!row.high_contrast : false,
    fontSizePercent: row?.font_size_percent ?? 100,
    dyslexiaFont: row ? !!row.dyslexia_font : false,
  });
});

settingsRouter.patch('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { highContrast, fontSizePercent, dyslexiaFont } = req.body;
  const db = await getDb();
  const existing = await db.get<{ high_contrast: number; font_size_percent: number; dyslexia_font: number }>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  const hc = highContrast !== undefined ? (highContrast ? 1 : 0) : (existing?.high_contrast ?? 0);
  const fs = fontSizePercent ?? existing?.font_size_percent ?? 100;
  const df = dyslexiaFont !== undefined ? (dyslexiaFont ? 1 : 0) : (existing?.dyslexia_font ?? 0);

  if (isAzureSql()) {
    // SQL Server: MERGE or IF EXISTS UPDATE ELSE INSERT
    if (existing) {
      await db.run('UPDATE user_settings SET high_contrast = ?, font_size_percent = ?, dyslexia_font = ? WHERE user_id = ?', [hc, fs, df, userId]);
    } else {
      await db.run('INSERT INTO user_settings (user_id, high_contrast, font_size_percent, dyslexia_font) VALUES (?, ?, ?, ?)', [userId, hc, fs, df]);
    }
  } else {
    // SQLite: INSERT OR REPLACE or ON CONFLICT
    await db.run(`
      INSERT INTO user_settings (user_id, high_contrast, font_size_percent, dyslexia_font)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET high_contrast = excluded.high_contrast, font_size_percent = excluded.font_size_percent, dyslexia_font = excluded.dyslexia_font
    `, [userId, hc, fs, df]);
  }
  res.json({ highContrast: !!hc, fontSizePercent: fs, dyslexiaFont: !!df });
});
