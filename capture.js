// capture.js
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/?_=' + Date.now(); // 캐시 무력화
const OUT = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ko-KR,ko',
      '--disable-dev-shm-usage'
    ],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // 모바일 에뮬레이션 (Pixel 7 비슷)
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    // 페이지 진입
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // 1) DOM 완성
    await page.waitForSelector('#calendarCapture', { timeout: 120000 });

    // 2) 폰트 로딩(가능한 경우)
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

    // 3) 여러 신호 중 하나라도 만족할 때까지 대기
    const start = Date.now();
    const MAX_WAIT = 120000; // 120초

    while (Date.now() - start < MAX_WAIT) {
      const ok = await page.evaluate(() => {
        const hasReady = document.body.getAttribute('data-ready') === '1';
        const titleOk = /\d{4}\.\s*\d{2}\./.test(document.getElementById('monthTitle')?.textContent || '');
        const grid = document.querySelector('#grid');
        const cells = grid ? grid.children.length : 0;
        return hasReady || titleOk || cells > 0;
      });
      if (오케이) break;
      await sleep(500);
    }

    // 네트워크 안정화 + 1초 여유
    try { await page.waitForNetworkIdle({ idleTime: 800, timeout: 30000 }); } catch {}
    await sleep(1000);

    // 캘린더 박스만 캡처
    const el = await page.$('#calendarCapture');
    if (!el) throw new Error('#calendarCapture not found');
    await el.screenshot({ path: OUT, type: 'png' });

    console.log('✅ Saved:', OUT);
  } catch (e) {
    console.error('❌ Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
