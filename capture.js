const fs = require("fs/promises");
const path = require("path");
const puppeteer = require("puppeteer");

const TARGET_URL = "https://sung5727.github.io/WEB_celrender/";
const OUT_DIR = path.join(process.cwd(), "docs", "capture");
const OUT_FILE = path.join(OUT_DIR, "calendar_mobile.png");

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3 };
const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Mobile Safari/537.36";

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function run() {
  await ensureOutDir();

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(UA);
    await page.setViewport(VIEWPORT);
    await page.emulateMediaType("screen");

    // 폰트 강제 적용
    await page.evaluateOnNewDocument(() => {
      const s = document.createElement("style");
      s.innerHTML = `* { font-family: system-ui, -apple-system, 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif !important; }`;
      document.documentElement.appendChild(s);
    });

    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 60_000 });

    // ✅ 여기 수정 (waitForTimeout → setTimeout)
    await new Promise((r) => setTimeout(r, 1500));

    const el = await page.$("#calendarCapture");
    if (!el) throw new Error("calendarCapture element not found");
    await el.screenshot({ path: OUT_FILE, type: "png" });

    console.log(`✅ Saved: ${OUT_FILE}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
