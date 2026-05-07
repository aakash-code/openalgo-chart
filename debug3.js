import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    window.localStorage.setItem('oa_apikey', '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea');
    window.localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000');
  });

  await page.goto('http://localhost:5001');
  await page.waitForTimeout(3000);
  
  await page.click('button[aria-label="Indicators"]');
  await page.waitForTimeout(1000);
  
  const locators = await page.locator('text=Risk Calculator').all();
  if (locators.length > 0) {
      await locators[locators.length - 1].click();
  }
  
  await page.waitForTimeout(2000);
  
  await browser.close();
  process.exit(0);
})();