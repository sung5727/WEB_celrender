// capture.js
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const url = "https://sung5727.github.io/WEB_celrender/"; // 배포된 index.html 주소

  const browser = await puppeteer.launch({
    headless: "new", // 최신 Puppeteer 옵션
    defaultViewport: {
      width: 430,   // 모바일 크기
      height: 800,
      deviceScaleFactor: 2,
    },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

  // body[data-ready] 속성이 생길 때까지 대기 (index.html에서 이미 넣어둠)
  await page.waitForFunction(
    () => document.body && document.querySelector("#grid") && document.querySelector("#monthTitle"),
    { timeout: 60000 }
  );

  // 캡처 대상 요소
  const el = await page.$("#calendarCapture");
  if (!el) throw new Error("calendarCapture element not found!");

  const outDir = path.join("docs", "capture");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "calendar_mobile.png");

  await el.screenshot({ path: outPath });
  console.log("✅ Saved:", outPath);

  await browser.close();
})();
