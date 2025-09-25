// capture.js  (HTML 수정 없이 타이틀+달력 한 장으로 캡처)
const puppeteer = require('puppeteer');

const URL = 'https://sung5727.github.io/WEB_celrender/';
const OUT = 'docs/capture/calendar_mobile.png';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR,ko;q=0.9'],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();

    // 픽셀 계열 모바일 에뮬레이션
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 렌더 준비 대기: 셀 생성 + 타이틀 존재
    const start = Date.now(); const MAX = 120000;
    while (Date.now() - start < MAX) {
      const ok = await page.evaluate(() => {
        const grid = document.querySelector('#grid');
        const cells = grid ? grid.children.length : 0;
        const title = document.getElementById('monthTitle');
        return cells > 0 && !!title && (title.textContent || '').trim().length > 0;
      });
      if (오케이) break;
      await sleep(300);
    }

    // 네트워크 잠잠해질 때까지 + 여유
    try { await page.waitForNetworkIdle({ idleTime: 600, timeout: 60000 }); } catch {}
    await sleep(500);

    // 페이지 안에 임시 래퍼(capWrap) 만들기: topbar + calendarCapture 를 한 상자에 넣음
    const handle = await page.evaluateHandle(() => {
      const wrap = document.createElement('div');
      wrap.id = 'capWrap';
      // 화면 밖에서 조립
      Object.assign(wrap.style, {
        position: 'fixed', left: '-99999px', top: '0',
        background: '#fff', border: '2px solid #dfe3e8', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,.04)'
      });

      // 1) topbar: 있으면 복제, 없으면 monthTitle로 간단 구성
      let topbar = document.querySelector('.topbar');
      topbar = topbar ? topbar.cloneNode(true) : (() => {
        const bar = document.createElement('div');
        Object.assign(bar.style, {
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'12px 16px', borderBottom:'1px solid #dfe3e8', background:'#fff'
        });
        const t = document.createElement('div');
        t.style.fontWeight = '800'; t.style.fontSize = '20px'; t.style.letterSpacing = '.5px';
        t.textContent = (document.getElementById('monthTitle')?.textContent || 'YYYY. MM.');
        bar.appendChild(t);
        return bar;
      })();

      // 2) 캘린더 영역: #calendarCapture 가 있으면 복제, 없으면 weekday+grid를 모아 구성
      const cap = document.querySelector('#calendarCapture');
      let calClone;
      if (cap) {
        calClone = cap.cloneNode(true);
      } else {
        calClone = document.createElement('div');
        const w = document.querySelector('.weekday')?.cloneNode(true);
        const g = document.querySelector('#grid')?.cloneNode(true);
        if (w) calClone.appendChild(w);
        if (g) calClone.appendChild(g);
      }

      // 캘린더 안쪽 경계선 보강(보이는 선 또렷하게)
      const style = document.createElement('style');
      style.textContent = `
        .weekday{background:#f3f4f6;border-bottom:1px solid #dfe3e8;}
        .grid{border-top:1px solid #dfe3e8;}
        .grid .cell{border-right:1px solid #dfe3e8;border-bottom:1px solid #dfe3e8;}
        .grid .cell:nth-child(7n){border-right:1px solid #dfe3e8;}
      `;
      calClone.prepend(style);

      wrap.appendChild(topbar);
      wrap.appendChild(calClone);
      document.body.appendChild(wrap);
      return wrap;
    });

    const box = handle.asElement();
    await box.screenshot({ path: OUT, type: 'png' });

    // 정리
    await page.evaluate(() => { document.getElementById('capWrap')?.remove(); });

    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
