import 'dotenv/config';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE LOG>', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR>', err.message));
  page.on('requestfailed', (req) => console.log('REQ FAILED>', req.url(), req.failure()?.errorText));
  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });
  console.log('URL after goto', page.url());
  console.log('TITLE', await page.title());
  const email = await page.$('input[name="email"]');
  const password = await page.$('input[name="password"]');
  console.log('email selector', !!email, 'password selector', !!password);
  await page.screenshot({ path: 'tmp/playwright-signin.png' });
  await browser.close();
}

run().catch((error) => {
  console.error('DEBUG FAILED', error);
  process.exit(1);
});