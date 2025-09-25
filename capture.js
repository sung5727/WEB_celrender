// capture.js
const puppeteer = require('puppeteer');

const URL = 'https://sung5727.github.io/WEB_celrender/';
const OUT = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR,ko'],
  });

  try {
    const page = await browser.newPage();

    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

    const start = Date.now();
    while (Date.now() - start < 60000) {
      const ready = await page.evaluate(() => {
        const title = document.getElementById('monthTitle')?.textContent || '';
        const titleOk = /\d{4}\.\s*\d{2}\./.test(title);
        const cells = document.querySelectorAll('#grid .cell').length;
        return titleOk && cells > 0;
      });
      if (ready) break;
      await sleep(400);
    }

    try { await page.waitForNetworkIdle({ idleTime: 800, timeout: 10000 }); } catch {}
    await sleep(500);

    const rect = await page.evaluate(() => {
      const el = document.querySelector('.card');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
    });
    if (!rect) throw new Error('.card not found');

    await page.screenshot({
      path: OUT,
      type: 'png',
      clip: rect,
      captureBeyondViewport: true,
    });

    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
