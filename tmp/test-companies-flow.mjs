import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Sign in
  await page.goto('http://localhost:3001/auth/sign-in');
  await page.fill('input[name="email"]', 'admin@poultryfarm.test');
  await page.fill('input[name="password"]', 'changeme123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  console.log('Signed in successfully');

  // Step 2: Go to companies page
  await page.goto('http://localhost:3001/dashboard/companies');
  await page.waitForSelector('table');
  console.log('Companies page loaded');

  // Get initial company count
  const initialCount = await page.locator('tbody tr').count();
  console.log(`Initial company count on page: ${initialCount}`);

  // Find a company to edit (pick the first one)
  const firstCompanyName = await page.locator('tbody tr:first-child td:first-child a').textContent();
  console.log(`First company: ${firstCompanyName}`);

  // Click the actions button for the first company
  await page.locator('tbody tr:first-child button[aria-label*="Actions"]').click();
  await page.waitForTimeout(500);
  
  // Click Edit using JavaScript
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editBtn = buttons.find(b => b.textContent?.trim() === 'Edit');
    if (editBtn) editBtn.click();
  });
  await page.waitForTimeout(500);
  
  // Edit the company name using JavaScript
  const newName = firstCompanyName + ' - EDITED';
  await page.evaluate((name) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => i.getAttribute('name') === 'name');
    if (nameInput) {
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, newName);
  await page.waitForTimeout(300);
  
  // Click Save Changes using JavaScript
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveBtn = buttons.find(b => b.textContent?.trim() === 'Save Changes');
    if (saveBtn) saveBtn.click();
  });

  // Wait for toast or page to settle
  await page.waitForTimeout(2000);

  // Step 4: Refresh the page
  await page.reload();
  await page.waitForSelector('table');
  console.log('Page refreshed after edit');

  // Step 5: Verify updated value is displayed
  const editedName = await page.locator('tbody tr:first-child td:first-child a').textContent();
  console.log(`Company name after refresh: ${editedName}`);
  if (editedName === newName) {
    console.log('PASS: Updated value persists after refresh');
  } else {
    console.log('FAIL: Updated value does NOT persist after refresh');
  }

  // Step 6: Delete another company (second row)
  const secondCompanyName = await page.locator('tbody tr:nth-child(2) td:first-child a').textContent();
  console.log(`Deleting company: ${secondCompanyName}`);
  
  await page.locator('tbody tr:nth-child(2) button[aria-label*="Actions"]').click();
  await page.waitForTimeout(500);
  
  // Click Delete using JavaScript
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const deleteBtn = buttons.find(b => b.textContent?.trim() === 'Delete');
    if (deleteBtn) deleteBtn.click();
  });
  await page.waitForTimeout(300);
  
  // Handle confirm dialog
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });
  
  await page.waitForTimeout(2000);

  // Step 8: Refresh again
  await page.reload();
  await page.waitForSelector('table');
  console.log('Page refreshed after delete');

  // Step 9: Verify deleted company does not reappear
  const companiesAfterDelete = await page.locator('tbody tr').count();
  console.log(`Company count after delete: ${companiesAfterDelete}`);
  
  const companyNames = await page.locator('tbody tr td:first-child a').allTextContents();
  const deletedReappeared = companyNames.some(name => name === secondCompanyName);
  
  if (!deletedReappeared && companiesAfterDelete === initialCount - 1) {
    console.log('PASS: Deleted company does not reappear after refresh');
  } else {
    console.log('FAIL: Deleted company reappeared or count is wrong');
  }

  await browser.close();
})();
