const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const root = path.resolve(__dirname, '..');
  const env = { ...process.env, STUDIO_USER_DATA: path.join(root, '.review-data', `layout-${Date.now()}`) };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.STUDIO_DEV_URL;
  const options = process.env.STUDIO_PACKAGED_EXE
    ? { executablePath: process.env.STUDIO_PACKAGED_EXE, args: [], env }
    : { args: [root], env };
  await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
  let app;
  const measurements = [];
  try {
    app = await electron.launch(options);
    const page = await app.firstWindow();
    await page.locator('.monaco-editor[data-ready-language="javascript"]').waitFor();
    for (const [width, height] of [[1366, 768], [1100, 680], [1000, 600]]) {
      const effectiveSize = await app.evaluate(({ BrowserWindow }, size) => {
        const window = BrowserWindow.getAllWindows()[0];
        window.setPosition(0, 0);
        window.setContentSize(size[0], size[1]);
        return window.getContentSize();
      }, [width, height]);
      // Win32 at 125% DPI can round a requested width by two CSS pixels.
      assert.ok(Math.abs(effectiveSize[0] - width) <= 2 && Math.abs(effectiveSize[1] - height) <= 2);
      await page.waitForFunction(size => innerWidth === size[0] && innerHeight === size[1], effectiveSize);
      await page.getByRole('button', { name: '並排', exact: true }).click();
      const layout = await page.evaluate(() => {
        const rect = selector => {
          const box = document.querySelector(selector).getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, width: box.width, height: box.height };
        };
        return {
          width: innerWidth, height: innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          documentWidth: document.documentElement.scrollWidth,
          workbench: rect('.workbench'), lesson: rect('.lesson-panel'), editor: rect('.code-editor'),
          run: rect('.run-button'), submit: rect('.submit-button'), results: rect('.results-panel'),
        };
      });
      assert.ok(layout.documentHeight <= layout.height + 1, `Outer page scrolls: ${JSON.stringify(layout)}`);
      assert.ok(layout.documentWidth <= layout.width + 1, 'Outer page overflows horizontally');
      assert.ok(layout.workbench.top <= 110, 'Header uses too much vertical space');
      assert.ok(layout.workbench.height >= height - 125, 'Workspace is not using available height');
      assert.ok(layout.lesson.height >= height - 125);
      assert.ok(layout.editor.height >= 150, 'Code editor is too short');
      assert.ok(layout.submit.bottom <= height && layout.run.bottom <= height, 'Execution controls are offscreen');
      measurements.push({ requested: [width, height], ...layout });
      await page.screenshot({ path: path.join(root, 'artifacts', `layout-${width}x${height}.png`) });

      await page.getByRole('button', { name: '教材', exact: true }).click();
      assert.equal(await page.locator('.editor-panel').isVisible(), false);
      await page.getByRole('button', { name: '程式', exact: true }).click();
      assert.equal(await page.locator('.lesson-panel').isVisible(), false);
      assert.ok(await page.locator('.editor-panel').evaluate(el => el.clientWidth) > width - 260);
      const before = await page.locator('.code-editor').evaluate(el => el.clientHeight);
      await page.getByRole('button', { name: '收合結果區', exact: true }).click();
      const after = await page.locator('.code-editor').evaluate(el => el.clientHeight);
      assert.ok(after > before + 80, 'Collapsing results did not give space back to the editor');
      await page.getByRole('button', { name: '展開結果區', exact: true }).click();
      await page.getByRole('button', { name: '並排', exact: true }).click();
    }
    // Running from a collapsed result panel must reopen it and retain access to stdin.
    await page.getByRole('button', { name: '收合結果區', exact: true }).click();
    await page.getByRole('button', { name: '執行程式', exact: false }).first().click();
    await page.getByText('執行完成', { exact: true }).waitFor();
    assert.equal(await page.locator('#result-content').isVisible(), true);
    console.log(JSON.stringify({ result: 'PASS', measurements, focusModes: true, resultCollapse: true }, null, 2));
  } finally { await app?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
