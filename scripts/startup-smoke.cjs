const { _electron: electron } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const executable = process.env.STUDIO_PACKAGED_EXE || path.join(root, 'release', '0.1.0', 'win-unpacked', 'Syntax Studio.exe');
  const env = { ...process.env, STUDIO_USER_DATA: path.join(root, '.review-data', `direct-start-${Date.now()}`) };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.STUDIO_TOOLCHAIN_ROOT;
  delete env.STUDIO_DEV_URL;
  let app, duplicate;
  let log = '';
  try {
    app = await electron.launch({ executablePath: executable, args: [], env });
    app.process().stderr.on('data', data => { log += data; });
    const page = await app.firstWindow();
    await page.locator('.monaco-editor').waitFor();
    const runtimes = await page.evaluate(() => window.studio.runtimes());
    assert.equal(runtimes.python.available, true);
    assert.equal(runtimes.rust.available, true);
    const locations = await app.evaluate(({ app }) => ({ progress: app.getPath('userData'), cache: app.getPath('sessionData') }));
    assert.notEqual(locations.progress, locations.cache);
    duplicate = spawn(executable, [], { env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    duplicate.stderr.on('data', data => { log += data; });
    const exit = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { duplicate.kill(); reject(new Error('Second instance did not exit.')); }, 10000);
      duplicate.on('error', error => { clearTimeout(timer); reject(error); });
      duplicate.on('exit', code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(exit, 0);
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    assert.doesNotMatch(log, /Unable to move the cache|Unable to create cache|Gpu Cache Creation failed/i);
    console.log(JSON.stringify({ result: 'PASS', directExe: true, projectPythonAndRustDetected: true, duplicateExitsCleanly: true, chromiumCacheErrors: false }, null, 2));
  } finally { duplicate?.kill(); await app?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
