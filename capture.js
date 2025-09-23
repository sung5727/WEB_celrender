const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const URL = 'https://sung5727.github.io/WEB_celrender/'; // 네 페이지

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 모바일(픽셀7 비슷)로 에뮬
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Mobile Safari/537.36'
    );
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });

    // 열기
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });

    // 필수 엘리먼트 등장 대기
    await page.waitForSelector('#calendarCapture', { timeout: 60000 });
    await page.waitForSelector('#grid', { timeout: 60000 });

    // 그리드에 셀 생성(최소 35개 이상)될 때까지 대기
    await page.waitForFunction(
      () => document.querySelectorAll('#grid .cell').length >= 35,
      { timeout: 60000 }
    );

    // 월 타이틀이 실제 숫자로 채워졌는지 확인
    await page.waitForFunction(
      () => /\d{4}\.\s*\d{2}\./.test(document.getElementById('monthTitle')?.textContent || ''),
      { timeout: 30000 }
    );

    // 폰트/레아웃 안정화 여유
    await page.waitForTimeout(1200);

    // 캡처 대상: 달력 카드 안쪽 (#calendarCapture)
    const el = await page.$('#calendarCapture');
    const box = await el.boundingBox();

    // 저장 경로 보장
    const outDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'calendar_mobile.png');

    await page.screenshot({
      path: outPath,
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, page.viewport().width - box.x),
        height: Math.min(box.height, page.viewport().height - box.y)
      }
    });

    console.log('Saved:', outPath);
  } catch (e) {
    console.error('Capture failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
