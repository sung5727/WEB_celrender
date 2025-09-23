// capture.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const URL = process.env.TARGET_URL || "https://sung5727.github.io/WEB_celrender/";
const OUT = process.env.OUT_PATH || "calendar_mobile.png";
const SEL = process.env.CAL_SELECTOR || "#calendarCapture";
const CROP = parseFloat(process.env.CROP_RATIO || "0.88");

(async () => {
  // 폴더 보장
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: {
      width: 412, height: 915, deviceScaleFactor: 2, isMobile: true,
      hasTouch: true, isLandscape: false,
    },
  });
  const page = await browser.newPage();

  // 모바일 UA로 고정
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36"
  );

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 90_000 });

  // 캘린더 등장 기다림
  const el = await page.waitForSelector(SEL, { timeout: 60_000 });
  const box = await el.boundingBox();
  if (!box) throw new Error("calendar element bbox is null");

  // 상단만 자르기(CROP 비율)
  let { x, y, width, height } = box;
  height = Math.round(height * (isFinite(CROP) ? CROP : 0.88));
  const clip = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height };

  await page.screenshot({ path: OUT, clip, type: "png" });
  await browser.close();

  console.log(`Saved: ${OUT}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
