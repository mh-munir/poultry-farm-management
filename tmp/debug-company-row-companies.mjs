import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultryfarm.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await page.goto(`${BASE_URL}/dashboard/companies`, { waitUntil: 'networkidle' });

  const companyToEdit = await prisma.company.findFirst({ orderBy: { id: 'asc' } });
  if (!companyToEdit) throw new Error('No company found to edit.');
  const companyName = companyToEdit.name;
  const table = page.locator('h2:has-text("Feeds and Medicine Companies")').locator('xpath=following::table[1]');
  const rows = table.locator('tbody tr').filter({ hasText: companyName });

  console.log('company name', companyName);
  console.log('companies table row count', await rows.count());
  if (await rows.count() === 0) {
    console.log('companies table html', await table.innerHTML());
    await page.screenshot({ path: 'tmp/debug-company-row-companies-no-row.png', fullPage: true });
    throw new Error('No row in Companies table matching company name.');
  }

  const row = rows.first();
  console.log('row html', await row.innerHTML());
  const actionBtn = row.locator('button[aria-label^="Actions for"], button:has-text("Actions")').first();
  console.log('actionBtn count', await actionBtn.count());
  if (await actionBtn.count() > 0) {
    console.log('actionBtn outerHTML', await actionBtn.evaluate((el) => el.outerHTML));
  }
  await browser.close();
  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error('DEBUG FAILED', error);
  await prisma.$disconnect();
  process.exit(1);
});