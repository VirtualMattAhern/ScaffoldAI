import { Router, Request } from 'express';
import { getDb } from '../db/client.js';
import { isAzureSql } from '../db/client.js';

export const settingsRouter = Router();

const getUserId = (req: Request & { userId?: string }) => req.userId ?? 'dev-user-001';

settingsRouter.get('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const db = await getDb();
  const row = await db.get<Record<string, unknown>>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  res.json({
    highContrast: row ? !!row.high_contrast : false,
    fontSizePercent: (row?.font_size_percent as number) ?? 100,
    dyslexiaFont: row ? !!row.dyslexia_font : false,
    reduceMotion: row ? !!(row.reduce_motion ?? 0) : false,
    focusMode: row ? !!(row.focus_mode ?? 0) : false,
    darkMode: row ? !!(row.dark_mode ?? 0) : false,
  });
});

settingsRouter.patch('/', async (req, res) => {
  const userId = getUserId(req as Request & { userId?: string });
  const { highContrast, fontSizePercent, dyslexiaFont, reduceMotion, focusMode, darkMode } = req.body;
  const db = await getDb();
  const existing = await db.get<{ high_contrast: number; font_size_percent: number; dyslexia_font: number; reduce_motion?: number; focus_mode?: number; dark_mode?: number }>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  const hc = highContrast !== undefined ? (highContrast ? 1 : 0) : (existing?.high_contrast ?? 0);
  const fs = fontSizePercent ?? existing?.font_size_percent ?? 100;
  const df = dyslexiaFont !== undefined ? (dyslexiaFont ? 1 : 0) : (existing?.dyslexia_font ?? 0);
  const rm = reduceMotion !== undefined ? (reduceMotion ? 1 : 0) : (existing?.reduce_motion ?? 0);
  const fm = focusMode !== undefined ? (focusMode ? 1 : 0) : (existing?.focus_mode ?? 0);
  const dm = darkMode !== undefined ? (darkMode ? 1 : 0) : (existing?.dark_mode ?? 0);

  if (isAzureSql()) {
    if (existing) {
      await db.run('UPDATE user_settings SET high_contrast = ?, font_size_percent = ?, dyslexia_font = ?, reduce_motion = ?, focus_mode = ?, dark_mode = ? WHERE user_id = ?', [hc, fs, df, rm, fm, dm, userId]);
    } else {
      await db.run('INSERT INTO user_settings (user_id, high_contrast, font_size_percent, dyslexia_font, reduce_motion, focus_mode, dark_mode) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, hc, fs, df, rm, fm, dm]);
    }
  } else {
    await db.run(`
      INSERT INTO user_settings (user_id, high_contrast, font_size_percent, dyslexia_font, reduce_motion, focus_mode, dark_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET high_contrast = excluded.high_contrast, font_size_percent = excluded.font_size_percent, dyslexia_font = excluded.dyslexia_font, reduce_motion = excluded.reduce_motion, focus_mode = excluded.focus_mode, dark_mode = excluded.dark_mode
    `, [userId, hc, fs, df, rm, fm, dm]);
  }
  res.json({ highContrast: !!hc, fontSizePercent: fs, dyslexiaFont: !!df, reduceMotion: !!rm, focusMode: !!fm, darkMode: !!dm });
});
