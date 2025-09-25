// capture.js
import puppeteer from 'puppeteer';

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

    // 모바일 에뮬레이션 (픽셀 7 느낌)
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 폰트 로딩(가능하면)
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

    // 타이틀(YYYY. MM.) + 그리드 준비될 때까지 폴링 (최대 60초)
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

    // 네트워크/스크립트 안정화
    try { await page.waitForNetworkIdle({ idleTime: 800, timeout: 10000 }); } catch {}
    await sleep(500);

    // === 핵심: .card 박스(타이틀+달력 전체) 좌표로 clip 캡처 ===
    const rect = await page.evaluate(() => {
      const el = document.querySelector('.card'); // 타이틀바 + 캘린더 묶음 컨테이너
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
    });
    if (!rect) throw new Error('.card not found');

    await page.screenshot({
      path: OUT,
      type: 'png',
      clip: rect, // 이 영역만 자르기
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
