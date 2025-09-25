// capture.js — CommonJS
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE = 'https://sung5727.github.io/WEB_celrender/';
const URL  = `${BASE}?nocache=${Date.now()}`;
const OUT  = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--lang=ko-KR,ko'],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // 모바일 에뮬레이션
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 폰트/네트워크 안정화
    await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(()=>{});
    await sleep(800);

    // 준비 대기
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });
    const waitReady = async (ms = 15000) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        const ok = await page.evaluate(() => {
          const grid = document.querySelector('#calendarCapture .grid');
          const cells = grid ? grid.children.length : 0;
          const titleText = document.getElementById('monthTitle')?.textContent?.trim() || '';
          const titleOk = /\d{4}\.\s*\d{2}\./.test(titleText);
          return cells > 0 && titleOk;
        });
        if (ok) return true;
        await sleep(300);
      }
      return false;
    };

    let ready = await waitReady(12000);

    // 미준비면 강제 렌더
    if (!ready) {
      await page.evaluate(() => {
        try {
          if (typeof window.render === 'function') window.render();
          else if (typeof window.drawCalendar === 'function') window.drawCalendar();

          const title = document.getElementById('monthTitle');
          if (title && /^Y+/.test(title.textContent)) {
            const n = new Date(); const pad = (x)=>String(x).padStart(2,'0');
            title.textContent = `${n.getFullYear()}. ${pad(n.getMonth()+1)}.`;
          }
        } catch (_) {}
      });
      await sleep(800);
      ready = await waitReady(8000);
    }

    // ▶ 저장 폴더 보장
    const outAbs = path.resolve(OUT);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });

    // 캡처
    const el = await page.$('#calendarCapture');
    if (!el) throw new Error('#calendarCapture not found');
    await el.screenshot({ path: outAbs, type: 'png' });

    console.log((ready ? '✅ ready' : '⚠️ fallback'), 'Saved:', outAbs);
  } catch (e) {
    console.error('❌ Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
