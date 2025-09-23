// capture.js  (Node 20 / ESM)
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/';   // 페이지 주소
const OUT = 'docs/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--lang=ko-KR,ko'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // 모바일(픽셀7 비슷)로 렌더
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 1) body[data-ready="1"] 신호 대기 (index.html에서 렌더 끝나면 세팅)
    await page.waitForFunction(
      () => document.body.getAttribute('data-ready') === '1',
      { timeout: 60000 }
    );

    // 2) 타이틀/그리드가 채워졌는지 확인
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelector('#calendarCapture .grid')?.children?.length > 0,
      { timeout: 60000 }
    );
    await page.waitForFunction(
      () => /\d{4}\.\s*\d{2}\./.test(document.getElementById('monthTitle')?.textContent || ''),
      { timeout: 30000 }
    );

    // 네트워크 여유 + 페인트 여유
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 });
    await sleep(800);

    // 캡처 대상 요소만 촬영
    const el = await page.$('#calendarCapture');
    if (!el) throw new Error('calendarCapture not found');

    await el.screenshot({ path: OUT, type: 'png' });

    // 사이드카 타임스탬프(커밋 강제용)
    fs.writeFileSync('docs/_last_run.txt', new Date().toISOString(), 'utf8');

    console.log(`Saved: ${OUT}`);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
