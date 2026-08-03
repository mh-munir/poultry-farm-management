import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultryfarm.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => console.log('PAGE LOG>', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR>', err));
  page.on('requestfailed', (req) => console.log('REQ FAILED>', req.url(), req.failure()?.errorText));
  page.on('close', () => console.log('PAGE CLOSED'));

  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await page.goto(`${BASE_URL}/dashboard/companies`, { waitUntil: 'networkidle' });

  const companyToEdit = await prisma.company.findFirst({ orderBy: { id: 'asc' } });
  if (!companyToEdit) throw new Error('No company found to edit.');
  console.log('Using company', companyToEdit.name);
  const editRow = page.locator('table tbody tr').filter({ hasText: companyToEdit.name });
  console.log('matching rows', await editRow.count());
  if (!(await editRow.count())) {
    console.log(await page.textContent('table'));
    await page.screenshot({ path: 'tmp/debug-company-row-table.png' });
    throw new Error('No matching row found');
  }
  const button = editRow.locator('button[aria-label^="Actions for"], button:has-text("Actions")').first();
  console.log('action button count', await button.count());
  console.log('button text', await button.textContent());
  await button.click();
  console.log('clicked action button');
  await page.screenshot({ path: 'tmp/debug-company-row-clicked.png' });
  await browser.close();
  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error('DEBUG FAILED', error);
  await prisma.$disconnect();
  process.exit(1);
});