import { appendFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'tmp', 'server-action-debug.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  try {
    appendFileSync(LOG_FILE, entry);
  } catch {
    // ignore log write errors
  }
}

export function logCompanyAction(action: string, data: Record<string, unknown>) {
  log(`[${action}] ${JSON.stringify(data)}`);
}
