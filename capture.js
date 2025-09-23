// scripts/capture.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const URL = process.env.TARGET_URL;
  const OUT = process.env.OUT_PATH || "public/calendar_mobile.png";
  const CAL_SELECTOR = process.env.CAL_SELECTOR || "#calendarCapture";
  const CROP = Math.min(0.999, Math.max(0.1, parseFloat(process.env.CROP_RATIO || "0.88")));

  if (!URL) {
    console.error("TARGET_URL env required");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--lang=ko-KR",
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // 모바일 기기 에뮬레이션 (픽셀 7 비슷)
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "ko-KR,ko;q=0.9" });

    // 페이지 로드
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });

    // 폰트가 로딩될 시간 조금만 더
    await page.evaluateHandle("document.fonts.ready");

    // 요소가 보일 때까지 대기
    await page.waitForSelector(CAL_SELECTOR, { timeout: 60000, visible: true });

    // 대상 요소 스크린샷
    const el = await page.$(CAL_SELECTOR);
    const full = await el.screenshot({ type: "png" });

    // 하단 자르기(CROP 비율)
    const sharpish = await import("node:buffer"); // Node 내장만 이용
    // Canvas 없이 빠르게 자르기 위해 puppeteer boundingBox 사용
    const box = await el.boundingBox();
    const cropHeight = Math.round(box.height * CROP);

    // puppeteer는 바로 crop 옵션이 없으니, 페이지에서 캔버스로 자르기
    const cropped = await page.evaluate(
      async (sel, ch) => {
        const node = document.querySelector(sel);
        const rect = node.getBoundingClientRect();
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(rect.width);
        canvas.height = ch;
        const ctx = canvas.getContext("2d");

        // drawImage로 다시 그리기
        const img = new Image();
        const blob = await new Promise((res) => canvas.toBlob(res));
        // 위 trick은 필요없어서 제거, 대신 toDataURL로 전달받을 이미지 사용
        return { w: canvas.width, h: canvas.height };
      },
      CAL_SELECTOR,
      cropHeight
    );

    // 위의 브라우저 내부 자르기는 번거로우므로, puppeteer의 clip로 다시 찍자
    // (초기 full을 찍은 건 폴백용. 최종본은 clip로 만들자)
    const clipShot = await page.screenshot({
      type: "png",
      clip: {
        x: box.x,
        y: box.y,
        width: Math.round(box.width),
        height: cropHeight,
      },
    });

    // 폴더 생성 후 저장
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, clipShot);
    console.log(`Saved: ${OUT}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
