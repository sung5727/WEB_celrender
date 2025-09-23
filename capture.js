// capture.js
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/';  // 페이지 주소
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

    // 모바일(픽셀 계열) 에뮬레이션
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 캘린더 렌더 완료 대기: #calendarCapture 안에 .cell 이 생길 때까지
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#calendarCapture .cell').length > 0,
      { timeout: 60000 }
    );

    // 네트워크가 잠잠해질 때까지 + 여유
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 }).catch(()=>{});
    await sleep(800);

    // 캡처 대상 요소만 스크린샷
    const box = await page.$('#calendarCapture');
    if (!box) throw new Error('capture target not found');
    await box.screenshot({ path: OUT, type: 'png' });

    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
