// capture.js  — CommonJS
const puppeteer = require('puppeteer');

const URL = 'https://sung5727.github.io/WEB_celrender/';
const OUT = 'docs/capture/calendar_mobile.png';

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR,ko'],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // 모바일(픽셀7 느낌)
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 1) 캘린더 박스 존재
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });

    // 2) 셀 렌더(그리드에 자식이 생길 때까지)
    await page.waitForFunction(
      () => document.querySelector('#calendarCapture .grid')?.children?.length > 0,
      { timeout: 60000 }
    );

    // 3) 타이틀에 "YYYY. MM." 패턴 보일 때
    await page.waitForFunction(
      () => /\d{4}\.\s*\d{2}\./.test(document.getElementById('monthTitle')?.textContent || ''),
      { timeout: 30000 }
    );

    // 4) 페이지에서 ‘준비됨’ 신호가 있으면 더 좋음(당신의 index.html이 이미 넣어둠)
    await page.waitForSelector('body[data-ready="1"]', { timeout: 5000 }).catch(() => {});

    // 네트워크 살짝 안정화 + 여유
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 10000 }).catch(() => {});
    await sleep(800);

    // 캘린더 영역만 캡처
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
