// capture.js
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/'; // 페이지 주소
const OUT = 'docs/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--lang=ko-KR,ko'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // 모바일 에뮬레이션
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 렌더 완료 신호 대기 (index.html에서 data-ready="1" 설정)
    await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });

    // 네트워크 idle + 여유
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 }).catch(()=>{});
    await sleep(800);

    // 캡처 대상 요소
    const target = await page.$('#calendarCapture');
    if (!target) throw new Error('#calendarCapture not found');

    await target.screenshot({ path: OUT, type: 'png' });
    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
