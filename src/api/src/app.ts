import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
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
import { verifySessionToken } from './auth/session.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { logError, logInfo, logWarn, requestLogContext } from './observability/logger.js';

export function createApp() {
  const app = express();

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.use((req, res, next) => {
    const incomingRequestId = req.header('x-request-id');
    req.requestId = incomingRequestId?.trim() || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);

    const startedAt = process.hrtime.bigint();
    logInfo('request.start', {
      ...requestLogContext(req),
      ip: req.ip,
    });

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logInfo('request.finish', {
        ...requestLogContext(req),
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  });

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(
    createRateLimiter({
      name: 'api-global',
      windowMs: 60_000,
      max: 240,
    }),
  );
  app.use(
    '/api/auth/login',
    createRateLimiter({
      name: 'auth-login',
      windowMs: 15 * 60_000,
      max: 10,
      message: 'Too many login attempts. Please wait a bit before trying again.',
    }),
  );

  const aiRateLimiter = createRateLimiter({
    name: 'ai-routes',
    windowMs: 60_000,
    max: 24,
    key: (req) => {
      const authHeader = req.headers.authorization;
      const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/);
      if (bearerMatch) {
        const session = verifySessionToken(bearerMatch[1]);
        if (session?.sub) return `user:${session.sub}`;
      }
      const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      return `ip:${forwarded || req.ip || 'unknown'}`;
    },
    message: 'AI is being used a lot right now. Please wait a moment and try again.',
  });
  app.use('/api/tasks/ai-suggest-top3', aiRateLimiter);
  app.use('/api/brain-dump/convert', aiRateLimiter);
  app.use('/api/focus-sentence/suggest', aiRateLimiter);
  app.use('/api/daily/helper', aiRateLimiter);
  app.use('/api/guided', aiRateLimiter);
  app.use('/api/decisions', aiRateLimiter);
  app.use('/api/playbooks/ai-suggest', aiRateLimiter);
  app.use('/api/tasks/weekly-review', aiRateLimiter);
  app.use('/api/playbooks/:id/ai-refine', aiRateLimiter);

  app.use(async (req, res, next) => {
    const isLogin = req.method === 'POST' && req.path === '/api/auth/login';
    const isLegacySession = req.method === 'POST' && req.path === '/api/auth/legacy-session';
    const isHealth = req.path === '/api/health';
    if (isLogin || isLegacySession || isHealth) return next();

    const authHeader = req.headers.authorization;
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/);
    if (bearerMatch) {
      const { validateEntraToken } = await import('./auth/entra.js');
      const user = await validateEntraToken(bearerMatch[1]);
      if (user) {
        req.userId = user.id;
        return next();
      }

      const session = verifySessionToken(bearerMatch[1]);
      if (session?.sub) {
        req.userId = session.sub;
        return next();
      }
    }

    logWarn('auth.unauthorized', requestLogContext(req));
    res.status(401).json({ error: 'Authentication required', requestId: req.requestId });
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

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logError('request.unhandled_error', requestLogContext(req), err);
    res.status(500).json({
      error: 'Unexpected server error',
      requestId: req.requestId,
    });
  });

  return app;
}

export const app = createApp();
