// capture.js
// 모바일 뷰포트로 #calendarCapture 엘리먼트만 캡처 → docs/capture/calendar_mobile.png 저장

const fs = require("fs/promises");
const path = require("path");
const puppeteer = require("puppeteer");

const TARGET_URL = "https://sung5727.github.io/WEB_celrender/"; // ← 본인 페이지
const OUT_DIR = path.join(process.cwd(), "docs", "capture");
const OUT_FILE = path.join(OUT_DIR, "calendar_mobile.png");

// 모바일처럼 보이도록 기본 값
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
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // 모바일 환경 설정
    await page.setUserAgent(UA);
    await page.setViewport(VIEWPORT);
    await page.emulateMediaType("screen");

    // 한글 폰트 미스매치 줄이기(있으면 사용됨)
    await page.evaluateOnNewDocument(() => {
      const s = document.createElement("style");
      s.innerHTML = `
        * { font-family: system-ui, -apple-system, 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif !important; }
      `;
      document.documentElement.appendChild(s);
    });

    // 페이지 오픈
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 60_000 });

    // 달력 렌더가 끝날 때까지 대기 (최대 30초)
    await page.waitForSelector("#calendarCapture", { timeout: 30_000 });

    // 살짝 안정화(애니/글꼴 레이아웃)
    await page.waitForTimeout(1200);

    // 엘리먼트만 캡처
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
