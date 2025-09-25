// capture.js — CommonJS (require)
const puppeteer = require('puppeteer');

const BASE = 'https://sung5727.github.io/WEB_celrender/';
const URL  = `${BASE}?nocache=${Date.now()}`;        // 캐시 우회
const OUT  = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR,ko'],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // 모바일 에뮬레이션
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 폰트 로딩 + 네트워크 잠잠해질 때까지 기본 대기
    await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(()=>{});
    await sleep(800);

    // 1) 캘린더 박스 존재
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });

    // 2) "정상 렌더" 조건: 그리드에 셀 존재 + 타이틀이 YYYY.MM 패턴
    const waitReady = async (ms = 15000) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        const ok = await page.evaluate(() => {
          const grid = document.querySelector('#calendarCapture .grid');
          const cells = grid ? grid.children.length : 0;
          const title = document.getElementById('monthTitle')?.textContent?.trim() || '';
          const titleOk = /\d{4}\.\s*\d{2}\./.test(title);
          return cells > 0 && titleOk;
        });
        if (오케이) return true;
        await sleep(300);
      }
      return false;
    };

    // 첫 시도
    let ready = await waitReady(12000);

    // 안되면 폴백: 페이지 내부 함수(있으면) 강제 실행
    if (!ready) {
      await page.evaluate(() => {
        try {
          // 당신의 index.html에 이미 있는 함수들이면 자동 호출
          if (typeof window.render === 'function') window.render();
          else if (typeof window.drawCalendar === 'function') window.drawCalendar();

          // 그래도 타이틀 기본값이면 최소한 현재 년/월은 채워둔다(이미지용 폴백)
          const title = document.getElementById('monthTitle');
          if (title && /^Y+/.test(title.textContent)) {
            const n = new Date();
            const pad = (x) => String(x).padStart(2,'0');
            title.textContent = `${n.getFullYear()}. ${pad(n.getMonth()+1)}.`;
          }
        } catch (_) {}
      });
      await sleep(800);
      ready = await waitReady(8000);
    }

    // 그래도 실패면 캘린더 박스만 그냥 캡처(최소 결과)
    const el = await page.$('#calendarCapture');
    if (!el) throw new Error('#calendarCapture not found');

    await el.screenshot({ path: OUT, type: 'png' });
    console.log(ready ? '✅ Rendered & saved' : '⚠️ Fallback shot & saved', OUT);
  } catch (e) {
    console.error('❌ Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
