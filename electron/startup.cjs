const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function prepareCacheDirectory(candidates) {
  for (const directory of candidates) {
    let probe;
    try {
      fs.mkdirSync(directory, { recursive: true });
      probe = path.join(directory, `.write-probe-${process.pid}-${crypto.randomUUID()}`);
      fs.writeFileSync(probe, '', { flag: 'wx' });
      fs.unlinkSync(probe);
      return directory;
    } catch {
      if (probe) { try { fs.unlinkSync(probe); } catch {} }
    }
  }
  throw new Error('無法建立 App 快取目錄，請確認 Windows 暫存資料夾可寫入。');
}

function findToolchainRoot({ executable, sourceRoot, override }) {
  const exeDirectory = path.dirname(executable);
  const candidates = [
    override,
    path.join(exeDirectory, 'toolchains'),
    path.join(sourceRoot, '.tools'),
    // Unpacked review builds live at <project>/release/<build>/win-unpacked.
    path.resolve(exeDirectory, '..', '..', '..', '.tools'),
  ];
  return candidates.find(directory => directory && fs.existsSync(path.join(directory, 'python', 'python.exe')) || directory && fs.existsSync(path.join(directory, 'rustup', 'toolchains')));
}

module.exports = { prepareCacheDirectory, findToolchainRoot };
