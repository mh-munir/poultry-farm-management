import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultryfarm.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function findSafeCompanyToDelete() {
  return prisma.company.findFirst({
    where: {
      transactions: { none: {} },
      payments: { none: {} },
      products: { none: {} }
    },
    orderBy: { id: 'asc' }
  });
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('dialog', async (dialog) => {
    console.log('Dialog opened:', dialog.message());
    await dialog.accept();
  });

  const companyToEdit = await prisma.company.findFirst({ orderBy: { id: 'asc' } });
  if (!companyToEdit) {
    throw new Error('No company found to edit in database.');
  }

  const companyToDelete = await findSafeCompanyToDelete();
  if (!companyToDelete) {
    throw new Error('No safe company without transactions/products found for deletion.');
  }
  if (companyToDelete.id === companyToEdit.id) {
    const nextCompany = await prisma.company.findFirst({
      where: {
        id: { not: companyToEdit.id },
        transactions: { none: {} },
        payments: { none: {} },
        products: { none: {} }
      },
      orderBy: { id: 'asc' }
    });
    if (!nextCompany) {
      throw new Error('Only one safe company exists, cannot perform edit + delete separately.');
    }
    console.log('Using a different company for deletion than the one used for edit.');
    companyToDelete = nextCompany;
  }

  const editName = `${companyToEdit.name} [E2E-${Date.now()}]`;
  const deleteName = companyToDelete.name;

  console.log('Visiting sign-in page...');
  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });

  console.log('Logging in as admin...');
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 })
  ]);

  if (!page.url().includes('/dashboard')) {
    throw new Error(`Login did not redirect to dashboard, landed on ${page.url()}`);
  }
  console.log('Logged in, navigating to Companies page...');
  await page.goto(`${BASE_URL}/dashboard/companies`, { waitUntil: 'networkidle' });

  console.log('Selecting company to edit:', companyToEdit.name);
  const companiesTable = page.locator('h2:has-text("Feeds and Medicine Companies")').locator('xpath=following::table[1]');
  const editRow = companiesTable.locator('tbody tr').filter({ hasText: companyToEdit.name });
  if (await editRow.count() === 0) {
    throw new Error(`Company ${companyToEdit.name} not found in Companies table.`);
  }

  const editActionBtn = editRow.locator('button[aria-label^="Actions for"]');
  if (await editActionBtn.count() === 0) {
    throw new Error(`Actions button not found for company ${companyToEdit.name}.`);
  }
  await editActionBtn.first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Edit")');

  const nameInput = page.locator('form input[name="name"]');
  const contactInput = page.locator('form input[name="contactPerson"]');
  if (!(await nameInput.count())) {
    throw new Error('Edit company form not visible or name input not found.');
  }

  console.log('Editing company name to:', editName);
  await nameInput.fill(editName);
  await Promise.all([
    page.click('form button[type="submit"]'),
    page.waitForTimeout(1500)
  ]);

  console.log('Checking updated company row in UI after edit...');
  await page.waitForTimeout(1000);
  const updatedRow = page.locator('table tbody tr').filter({ hasText: editName });
  if (await updatedRow.count() === 0) {
    throw new Error('Updated company name not found in UI after edit.');
  }

  const persistedEdit = await prisma.company.findUnique({ where: { id: companyToEdit.id } });
  if (!persistedEdit || persistedEdit.name !== editName) {
    throw new Error(`Company row not updated in DB. Expected ${editName}, got ${persistedEdit?.name}`);
  }
  console.log('DB confirmed edit persisted. refreshed page...');

  await page.reload({ waitUntil: 'networkidle' });
  const refreshedRow = page.locator('table tbody tr').filter({ hasText: editName });
  if (await refreshedRow.count() === 0) {
    throw new Error('Updated company disappeared after refresh.');
  }
  console.log('Refresh confirmed updated value remains displayed.');

  console.log('Selecting company to delete:', deleteName);
  const deleteRow = page.locator('table tbody tr').filter({ hasText: deleteName });
  if (await deleteRow.count() === 0) {
    throw new Error(`Company ${deleteName} not found in Companies table for deletion.`);
  }
  await deleteRow.locator('button[aria-label^="Actions for"], button:has-text("Actions")').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Delete")');
  await page.waitForTimeout(1500);
  console.log('Confirmed delete dialog.');

  const deletedRowAfter = page.locator('table tbody tr').filter({ hasText: deleteName });
  if (await deletedRowAfter.count() > 0) {
    throw new Error('Deleted company still present in UI immediately after delete.');
  }

  const persistedDelete = await prisma.company.findUnique({ where: { id: companyToDelete.id } });
  if (persistedDelete) {
    throw new Error(`Company ${deleteName} still exists in DB after delete.`);
  }
  console.log('DB confirmed delete committed. refreshing page...');

  await page.reload({ waitUntil: 'networkidle' });
  const deletedRowAfterRefresh = page.locator('table tbody tr').filter({ hasText: deleteName });
  if (await deletedRowAfterRefresh.count() > 0) {
    throw new Error('Deleted company reappeared after page refresh.');
  }

  console.log('Delete verified: company did not reappear after refresh.');

  await browser.close();
  await prisma.$disconnect();
  console.log('E2E company edit/delete flow passed successfully.');
}

run().catch(async (error) => {
  console.error('E2E verification failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
