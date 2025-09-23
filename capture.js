// capture.js
const puppeteer = require('puppeteer');

async function run() {
  const TARGET_URL = 'https://sung5727.github.io/WEB_celrender/';

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  );
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  page.on('dialog', async (d) => { try { await d.dismiss(); } catch(e) {} });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#calendarCapture', { timeout: 30000 });

  // 최신 데이터 적용(가능하면)
  try {
    await page.evaluate(async () => {
      if (typeof reloadFromSheet === 'function') await reloadFromSheet();
      if (typeof render === 'function') await render();
      else if (typeof drawCalendar === 'function') drawCalendar();
    });
    await page.waitForTimeout(1200);
  } catch (e) {}

  const el = await page.$('#calendarCapture');
  if (!el) throw new Error('calendarCapture element not found');

  await el.screenshot({ path: 'docs/calendar.png' });

  await browser.close();
  console.log('✅ captured docs/calendar.png');
}

run().catch(err => { console.error('❌ capture failed:', err); process.exit(1); });
