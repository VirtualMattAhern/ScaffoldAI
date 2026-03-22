import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from src/api/ or src/api/src/ (whichever exists)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
import { ensureSchema } from './db/schema.js';
import { app } from './app.js';
import { logError, logInfo } from './observability/logger.js';
const PORT = process.env.PORT ?? 3003;

process.on('unhandledRejection', (reason) => {
  logError('process.unhandled_rejection', {}, reason);
});

process.on('uncaughtException', (err) => {
  logError('process.uncaught_exception', {}, err);
  process.exit(1);
});

ensureSchema().then(() => {
  app.listen(PORT, () => {
    logInfo('server.started', { port: Number(PORT) });
  });
}).catch((err) => {
  logError('server.schema_init_failed', {}, err);
  process.exit(1);
});
