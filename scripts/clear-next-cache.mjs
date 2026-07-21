import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

for (const target of ['.next', '.turbo']) {
  rmSync(path.join(projectRoot, target), {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100
  });
}

console.log('Cleared Next.js build cache.');
