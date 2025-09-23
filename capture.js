// capture.js
import puppeteer from 'puppeteer';

const URL = 'https://sung5727.github.io/WEB_celrender/'; // 기존 페이지
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

    // 모바일 에뮬레이션(픽셀 계열)
    await page.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 캘린더 그리드가 채워질 때까지 대기
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelector('#calendarCapture .grid')?.children?.length > 0,
      { timeout: 60000 }
    );

    // 타이틀 텍스트가 YYYY. MM. 형태로 표시될 때까지 대기
    await page.waitForFunction(
      () => /\d{4}\.\s*\d{2}\./.test(document.getElementById('monthTitle')?.textContent || ''),
      { timeout: 30000 }
    );

    // 네트워크 idle + 여유
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60000 });
    await sleep(1000);

    // 페이지 안에서 임시 래퍼를 만들어(타이틀+달력) 스타일 주입 후 그 엘리먼트만 캡처
    const capHandle = await page.evaluateHandle(() => {
      const cal = document.querySelector('#calendarCapture');
      if (!cal) return null;

      // 기존 달력 복제 (원본 건드리지 않음)
      const clone = cal.cloneNode(true);

      // 현재 타이틀 텍스트
      const titleText = (document.getElementById('monthTitle')?.textContent || '').trim() || 'YYYY. MM.';

      // 임시 래퍼 + 타이틀 바
      const wrap = document.createElement('div');
      wrap.id = 'capWrap';
      wrap.style.position = 'fixed';
      wrap.style.left = '-99999px'; // 화면 밖에서 조립
      wrap.style.top = '0';
      wrap.style.background = '#fff';
      wrap.style.border = '2px solid #dfe3e8';
      wrap.style.borderRadius = '12px';
      wrap.style.overflow = 'hidden';
      wrap.style.boxShadow = '0 4px 10px rgba(0,0,0,.04)';

      const topbar = document.createElement('div');
      topbar.style.display = 'flex';
      topbar.style.alignItems = 'center';
      topbar.style.justifyContent = 'center';
      topbar.style.padding = '12px 16px';
      topbar.style.borderBottom = '1px solid #dfe3e8';
      topbar.style.background = '#fff';

      const title = document.createElement('div');
      title.textContent = titleText;
      title.style.fontWeight = '800';
      title.style.fontSize = '20px';
      title.style.letterSpacing = '.5px';
      topbar.appendChild(title);

      // 캘린더 클론에 보더 보강(셀 경계 또렷)
      const style = document.createElement('style');
      style.textContent = `
        .weekday{background:#f3f4f6;border-bottom:1px solid #dfe3e8;}
        .grid{border-top:1px solid #dfe3e8;}
        .grid .cell{border-right:1px solid #dfe3e8;border-bottom:1px solid #dfe3e8;}
        .grid .cell:nth-child(7n){border-right:1px solid #dfe3e8;}
      `;
      clone.prepend(style);

      wrap.appendChild(topbar);
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      return wrap;
    });

    if (!capHandle) throw new Error('capWrap build failed');

    // capWrap 요소만 캡처
    const box = await capHandle.asElement();
    await box.screenshot({ path: OUT, type: 'png' });

    // 정리
    await page.evaluate(() => {
      const w = document.getElementById('capWrap');
      if (w) w.remove();
    });

    console.log('Saved:', OUT);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
