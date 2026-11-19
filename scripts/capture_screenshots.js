const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(edgePath) ? edgePath : chromePath;

  console.log(`Using browser: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const outputDir = path.join(__dirname, '..', 'docs', 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const page = await browser.newPage();

  // 1. Desktop Dashboard Cockpit (1440x900)
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8585', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.glass-panel', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1200)); // wait for animations and SSE initial data

  const desktopPath = path.join(outputDir, 'dashboard_desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log(`[✓] Captured: ${desktopPath}`);

  // 2. Multi-Tenant Chargeback Tab
  const chargebackBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Cost Chargeback'));
  });
  if (chargebackBtn) {
    await chargebackBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const chargebackPath = path.join(outputDir, 'chargeback_table.png');
    await page.screenshot({ path: chargebackPath, fullPage: false });
    console.log(`[✓] Captured: ${chargebackPath}`);
  }

  // 3. Prompt Playground with Diff
  const playgroundBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Prompt Playground'));
  });
  if (playgroundBtn) {
    await playgroundBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Click "Run Cache Audit" button
    const auditBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Run Cache Audit'));
    });
    if (auditBtn) {
      await auditBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // Switch to Diff view
    const diffBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Diff'));
    });
    if (diffBtn) {
      await diffBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    const playgroundPath = path.join(outputDir, 'prompt_playground.png');
    await page.screenshot({ path: playgroundPath, fullPage: false });
    console.log(`[✓] Captured: ${playgroundPath}`);
  }

  // 4. Mobile Viewport (iPhone 14 / 390x844)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  // Switch back to Cockpit
  const cockpitBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('FinOps Cockpit'));
  });
  if (cockpitBtn) {
    await cockpitBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  const mobilePath = path.join(outputDir, 'dashboard_mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`[✓] Captured: ${mobilePath}`);

  // 5. Generate GIF frames for animated walkthrough
  console.log('Capturing frames for demo GIF...');
  const frameDir = path.join(__dirname, '..', 'docs', 'images', 'frames');
  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true });
  }

  await page.setViewport({ width: 1200, height: 750, deviceScaleFactor: 1.5 });
  await page.goto('http://localhost:8585', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  // Frame 1-3: Cockpit overview
  for (let i = 0; i < 3; i++) {
    await page.screenshot({ path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await new Promise(r => setTimeout(r, 300));
  }

  // Frame 4-6: Switch to Chargeback
  const cb = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Cost Chargeback'));
  });
  if (cb) await cb.click();
  await new Promise(r => setTimeout(r, 400));
  for (let i = 3; i < 6; i++) {
    await page.screenshot({ path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await new Promise(r => setTimeout(r, 300));
  }

  // Frame 7-12: Switch to Playground, run audit, toggle diff
  const pg = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Prompt Playground'));
  });
  if (pg) await pg.click();
  await new Promise(r => setTimeout(r, 400));

  for (let i = 6; i < 8; i++) {
    await page.screenshot({ path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await new Promise(r => setTimeout(r, 300));
  }

  const audit = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Run Cache Audit'));
  });
  if (audit) await audit.click();
  await new Promise(r => setTimeout(r, 800));

  for (let i = 8; i < 11; i++) {
    await page.screenshot({ path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await new Promise(r => setTimeout(r, 300));
  }

  const diff = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Diff'));
  });
  if (diff) await diff.click();
  await new Promise(r => setTimeout(r, 500));

  for (let i = 11; i < 15; i++) {
    await page.screenshot({ path: path.join(frameDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await new Promise(r => setTimeout(r, 300));
  }

  await browser.close();
  console.log('[✓] All screenshot frames captured successfully.');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
