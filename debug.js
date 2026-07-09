import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:5001');
    await page.waitForTimeout(5000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('PAGE BODY:', bodyText.substring(0, 500));
  } catch (e) {
    console.error('Navigation failed:', e);
  }
  
  await browser.close();
  process.exit(0);
})();