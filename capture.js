// capture.js  (ESM)
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/';   // GitHub Pages 주소
const OUT = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--lang=ko-KR,ko'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // Pixel 7 느낌으로 에뮬
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 페이지 렌더 완료 신호 대기
    await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });

    // 약간의 여유 (폰트/레이아웃 안정화)
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 }).catch(()=>{});
    await sleep(800);

    // 대상 엘리먼트만 캡처
    const el = await page.$('#calendarCapture');
    if (!el) throw new Error('calendarCapture not found');
    await el.screenshot({ path: OUT, type: 'png' });

    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
