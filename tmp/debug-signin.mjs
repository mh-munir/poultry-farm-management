import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/sign-in', { waitUntil: 'domcontentloaded' });
  console.log('loaded', page.url());
  await page.fill('input[name="email"]', 'admin@poultryfarm.test');
  await page.fill('input[name="password"]', 'changeme123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(5000);
  console.log('after click', page.url());
  console.log(await page.textContent('body'));
  await browser.close();
})();
