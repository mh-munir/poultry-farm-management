import 'dotenv/config';
import fs from 'fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultryfarm.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

const log = [];
function trace(message) {
  log.push(message);
  fs.writeFileSync('tmp/playwright-debug.log', log.join('\n'));
}

async function run() {
  trace('start');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => trace('PAGE LOG> ' + msg.text()));
  page.on('pageerror', (err) => trace('PAGE ERROR> ' + err.message));
  page.on('requestfailed', (req) => trace(`REQ FAILED> ${req.url()} ${req.failure()?.errorText}`));

  trace(`goto ${BASE_URL}/auth/sign-in`);
  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });
  trace('url ' + page.url());
  const body = await page.locator('body').innerHTML();
  trace('body length ' + body.length);
  trace('email count ' + await page.locator('input[name="email"]').count());
  trace('password count ' + await page.locator('input[name="password"]').count());
  trace('submit count ' + await page.locator('button[type="submit"]').count());
  await page.screenshot({ path: 'tmp/playwright-debug-signin.png', fullPage: true });
  await browser.close();
  trace('done');
}

run().catch(async (error) => {
  fs.writeFileSync('tmp/playwright-debug.log', log.concat(['ERROR ' + error.stack]).join('\n'));
  console.error(error);
  process.exit(1);
});