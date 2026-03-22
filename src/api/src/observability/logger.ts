import type { Request } from 'express';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') return level;
  return 'info';
}

function shouldLog(level: LogLevel) {
  return LEVEL_RANK[level] >= LEVEL_RANK[currentLevel()];
}

export function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

function writeLog(level: LogLevel, event: string, data: Record<string, unknown> = {}, err?: unknown) {
  if (!shouldLog(level)) return;
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'skafoldai-api',
    environment: process.env.NODE_ENV || 'development',
    ...data,
  };
  if (err !== undefined) payload.error = serializeError(err);
  const line = JSON.stringify(payload);
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  writeLog('info', event, data);
}

export function logWarn(event: string, data?: Record<string, unknown>, err?: unknown) {
  writeLog('warn', event, data, err);
}

export function logError(event: string, data?: Record<string, unknown>, err?: unknown) {
  writeLog('error', event, data, err);
}

export function requestLogContext(req: Request) {
  return {
    requestId: req.requestId,
    userId: req.userId,
    method: req.method,
    path: req.originalUrl || req.url,
  };
}
