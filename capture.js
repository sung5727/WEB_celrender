// capture.js
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// ===== 설정 =====
const URL = 'https://sung5727.github.io/WEB_celrender/'; // 기존 페이지
const OUT_DIR = 'docs';
const OUT_FILE = 'calendar_mobile.png';
const OUT = path.join(OUT_DIR, OUT_FILE);

// 필요 시(액션/서버) 크롬 경로 지정 지원
const EXEC_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 출력 폴더 보장
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: EXEC_PATH, // puppeteer-core 환경 대비
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ko-KR,ko',
      '--font-render-hinting=medium',
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // 모바일 에뮬레이션(픽셀 계열)
    await page.emulate({
      viewport: {
        width: 412,
        height: 915,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    // 페이지 로드
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    // 캘린더 컨테이너 등장 + 그리드 채워질 때까지 기다림
    await page.waitForSelector('#calendarCapture', { timeout: 90_000 });
    await page.waitForFunction(
      () => document.querySelector('#calendarCapture .grid')?.children?.length > 0,
      { timeout: 60_000 }
    );

    // 타이틀이 YYYY. MM. 형식으로 표시될 때까지
    await page.waitForFunction(
      () => /\d{4}\.\s*\d{1,2}\./.test(document.getElementById('monthTitle')?.textContent || ''),
      { timeout: 30_000 }
    );

    // 네트워크 안정화 + 남는 애니메이션 마감 대기
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 60_000 });
    await sleep(1000);

    // 임시 래퍼(capWrap) 구성: 타이틀 바 + 달력 복제 + 보더 스타일 주입
    const capHandle = await page.evaluateHandle(() => {
      const cal = document.querySelector('#calendarCapture');
      if (!cal) return null;

      // 기존 달력 "복제" (원본 DOM에는 손대지 않음)
      const clone = cal.cloneNode(true);

      // 타이틀 텍스트
      const titleText =
        (document.getElementById('monthTitle')?.textContent || '').trim() || 'YYYY. MM.';

      // 래퍼
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

      // 타이틀 바
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

      // 🔹 스타일을 wrap 안에 "직접" 삽입해야 캡처에 반영됨
      const style = document.createElement('style');
      style.textContent = `
        .weekday{background:#f3f4f6;border-bottom:1px solid #dfe3e8;}
        .grid{border-top:1px solid #dfe3e8;}
        .grid .cell{border-right:1px solid #dfe3e8;border-bottom:1px solid #dfe3e8;}
        .grid .cell:nth-child(7n){border-right:1px solid #dfe3e8;}
        .date{font-weight:700;}
      `;

      wrap.appendChild(style);
      wrap.appendChild(topbar);
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      return wrap;
    });

    if (!capHandle) throw new Error('capWrap build failed');

    // 요소만 캡처
    const box = await capHandle.asElement();
    await box.screenshot({ path: OUT, type: 'png' });

    // cleanup
    await page.evaluate(() => {
      const w = document.getElementById('capWrap');
      if (w) w.remove();
    });

    console.log('✅ Saved:', OUT);
  } catch (e) {
    console.error('❌ Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
