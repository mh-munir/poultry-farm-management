import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.SMOKE_EMAIL || 'admin@poultryfarm.test';
const password = process.env.SMOKE_PASSWORD || 'changeme123';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Opening ${baseUrl}`);
    await page.goto(`${baseUrl}/auth/sign-in`, { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('Signed in successfully');

    await page.goto(`${baseUrl}/dashboard/companies`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table', { timeout: 30000 });

    const firstCompanyLink = page.locator('tbody tr td:first-child a').first();
    if (!(await firstCompanyLink.count())) {
      throw new Error('No company links were found on the companies page.');
    }

    const companyName = (await firstCompanyLink.textContent())?.trim() || 'Unknown company';
    console.log(`Opening company profile: ${companyName}`);
    await firstCompanyLink.click();
    await page.waitForURL(/\/dashboard\/companies\/\d+/, { timeout: 30000 });

    const medicineTable = page.locator('table').filter({ has: page.locator('th', { hasText: 'Medicine Name' }) }).first();
    await medicineTable.waitFor({ state: 'visible', timeout: 30000 });

    const firstEditButton = medicineTable.locator('button', { hasText: 'Edit' }).first();
    if (!(await firstEditButton.count())) {
      throw new Error('No edit button was found for the medicine table.');
    }

    const rowBefore = firstEditButton.locator('xpath=ancestor::tr');
    const originalName = (await rowBefore.locator('td').nth(2).textContent())?.trim() || '';
    const tempName = `SMOKE-${Date.now()}`;

    console.log(`Editing medicine row: ${originalName || 'unknown'} -> ${tempName}`);
    await firstEditButton.click();

    const productNameInput = page.getByPlaceholder('Edit product name');
    await productNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await productNameInput.fill(tempName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await page.waitForTimeout(2500);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await medicineTable.waitFor({ state: 'visible', timeout: 30000 });

    const updatedText = await page.locator('tbody').filter({ hasText: tempName }).textContent();
    if (!updatedText || !updatedText.includes(tempName)) {
      throw new Error(`Expected the updated medicine name '${tempName}' to appear after refresh.`);
    }

    console.log('PASS: medicine edit persisted after refresh');
  } catch (error) {
    console.error('FAIL:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
