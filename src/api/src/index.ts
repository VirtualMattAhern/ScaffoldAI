import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from src/api/ or src/api/src/ (whichever exists)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
import express, { Request } from 'express';
import cors from 'cors';
import { ensureSchema } from './db/schema.js';
import { goalsRouter } from './routes/goals.js';
import { playbooksRouter } from './routes/playbooks.js';
import { tasksRouter } from './routes/tasks.js';
import { brainDumpRouter } from './routes/brain-dump.js';
import { focusSentenceRouter } from './routes/focus-sentence.js';
import { dailyRouter } from './routes/daily.js';
import { settingsRouter } from './routes/settings.js';
import { authRouter } from './routes/auth.js';
import { guidedRouter } from './routes/guided.js';
import { decisionsRouter } from './routes/decisions.js';

const app = express();
const PORT = process.env.PORT ?? 3003;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Auth middleware: Bearer token (Entra) or X-User-Id (legacy email)
app.use(async (req, res, next) => {
  const isLogin = req.method === 'POST' && req.path === '/api/auth/login';
  const isHealth = req.path === '/api/health';
  if (isLogin || isHealth) return next();

  const authHeader = req.headers.authorization;
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/);
  if (bearerMatch) {
    const { validateEntraToken } = await import('./auth/entra.js');
    const user = await validateEntraToken(bearerMatch[1]);
    if (user) {
      (req as Request & { userId?: string }).userId = user.id;
      return next();
    }
  }

  const userId = req.headers['x-user-id'] as string | undefined;
  if (userId?.trim()) {
    (req as Request & { userId?: string }).userId = userId.trim();
    return next();
  }

  res.status(401).json({ error: 'Authentication required' });
});

app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/playbooks', playbooksRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/brain-dump', brainDumpRouter);
app.use('/api/focus-sentence', focusSentenceRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/guided', guidedRouter);
app.use('/api/decisions', decisionsRouter);

app.get('/api/health', (_req, res) => {
  const azureConfigured = !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  );
  res.json({
    status: 'ok',
    version: '1.0.0',
    azureOpenAI: azureConfigured ? 'configured' : 'not configured',
  });
});

ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`SkafoldAI API running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
