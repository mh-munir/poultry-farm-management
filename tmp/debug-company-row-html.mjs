import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultryfarm.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function run() {
  const browser = await chromium.launch();
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
  const editRow = page.locator('table tbody tr').filter({ hasText: companyToEdit.name });
  console.log('row count', await editRow.count());
  if (!(await editRow.count())) {
    throw new Error('No matching row found');
  }
  console.log('row html:');
  console.log(await editRow.first().innerHTML());
  console.log('buttons count', await editRow.locator('button').count());
  for (let i = 0; i < await editRow.locator('button').count(); i++) {
    console.log('button', i, await editRow.locator('button').nth(i).getAttribute('aria-label'), await editRow.locator('button').nth(i).textContent());
  }
  console.log('links count', await editRow.locator('a').count());
  for (let i = 0; i < await editRow.locator('a').count(); i++) {
    console.log('link', i, await editRow.locator('a').nth(i).getAttribute('href'), await editRow.locator('a').nth(i).textContent());
  }
  await page.screenshot({ path: 'tmp/debug-company-row-html.png', fullPage: true });
  await browser.close();
  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error('DEBUG FAILED', error);
  await prisma.$disconnect();
  process.exit(1);
});