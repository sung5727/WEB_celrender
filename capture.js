try {
  await page.waitForSelector('#calendarCapture', { timeout: 60000 });
} catch(e) {
  const html = await page.content();
  console.error('==== PAGE HTML START ====');
  console.error(html.substring(0, 1000)); // 앞부분만
  console.error('==== PAGE HTML END ====');
  throw e;
}
