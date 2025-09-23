// scripts/capture.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const URL = process.env.TARGET_URL;
  const OUT = process.env.OUT_PATH || "public/calendar_mobile.png";
  const SEL = process.env.CAL_SELECTOR || "#calendarCapture";
  const CROP = Math.min(0.999, Math.max(0.1, parseFloat(process.env.CROP_RATIO || "0.88")));

  if (!URL) {
    console.error("TARGET_URL env required");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=ko-KR"],
  });

  try {
    const page = await browser.newPage();

    // 모바일 환경 흉내
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "ko-KR,ko;q=0.9" });

    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
    await page.evaluateHandle("document.fonts && document.fonts.ready"); // 폰트 로딩 대기

    await page.waitForSelector(SEL, { visible: true, timeout: 60000 });
    const el = await page.$(SEL);

    // 요소가 화면 안으로 들어오도록 스크롤
    await page.evaluate((e) => e.scrollIntoView({ block: "start", inline: "nearest" }), el);

    const box = await el.boundingBox();
    if (!box) throw new Error("Cannot get bounding box of calendar element");

    const clip = {
      x: Math.max(0, Math.floor(box.x)),
      y: Math.max(0, Math.floor(box.y)),
      width: Math.max(1, Math.floor(box.width)),
      height: Math.max(1, Math.floor(box.height * CROP)), // 하단 자르기
    };

    const shot = await page.screenshot({ type: "png", clip });

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, shot);
    console.log(`Saved: ${OUT} (${clip.width}x${clip.height})`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
