import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5001');
  await page.waitForTimeout(3000);
  
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('body.html', html);
  
  await browser.close();
  process.exit(0);
})();