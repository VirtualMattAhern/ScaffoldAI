import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from src/api/ or src/api/src/ (whichever exists)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
import { ensureSchema } from './db/schema.js';
import { app } from './app.js';
const PORT = process.env.PORT ?? 3003;

ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`SkafoldAI API running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
