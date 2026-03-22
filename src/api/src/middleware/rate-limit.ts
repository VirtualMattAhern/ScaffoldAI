import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };
type KeyFn = (req: Request) => string;

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createRateLimiter(options: {
  name: string;
  windowMs: number;
  max: number;
  key?: KeyFn;
  message?: string;
}) {
  const keyFn =
    options.key ??
    ((req: Request) => {
      const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      return forwarded || req.ip || 'unknown';
    });

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpired(now);
    const key = `${options.name}:${keyFn(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000).toString());
      return res.status(429).json({
        error: options.message ?? 'Too many requests. Please slow down and try again shortly.',
      });
    }

    return next();
  };
}
