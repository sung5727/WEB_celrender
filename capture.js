const fs = require("fs/promises");
const path = require("path");
const puppeteer = require("puppeteer");

const TARGET_URL = "https://sung5727.github.io/WEB_celrender/";
const OUT_DIR = path.join(process.cwd(), "docs", "capture");
const OUT_FILE = path.join(OUT_DIR, "calendar_mobile.png");

// 픽셀7 모바일 뷰
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3 };
const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Mobile Safari/537.36";

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function waitForCalendarReady(page) {
  // 1) 캘린더 루트가 뜰 때까지
  await page.waitForSelector("#calendarCapture #grid", { visible: true, timeout: 60_000 });

  // 2) 월 타이틀이 초기 텍스트(YYYY. MM.)가 아닌 실제 값일 것
  await page.waitForFunction(
    () => {
      const t = document.querySelector("#monthTitle")?.textContent?.trim() || "";
      return /\d{4}\.\s*\d{2}\./.test(t);
    },
    { timeout: 60_000 }
  );

  // 3) 그리드에 셀(최소 28, 보통 35~42)이 채워졌는지
  await page.waitForFunction(
    () => document.querySelectorAll("#grid .cell").length >= 28,
    { timeout: 60_000 }
  );

  // 4) 폰트 로딩 완료 (가능하면)
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  // 5) 레이아웃 안정화(두 프레임) + 여유 300ms
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );
  await sleep(300);
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

    // 시스템 폰트 강제 (한글 가시성)
    await page.evaluateOnNewDocument(() => {
      const s = document.createElement("style");
      s.innerHTML =
        "*{font-family:system-ui,-apple-system,'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif!important}";
      document.documentElement.appendChild(s);
    });

    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 60_000 });

    // 페이지가 완전히 그려질 때까지 기다리기
    await waitForCalendarReady(page);

    // 요소 단위 캡처
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
