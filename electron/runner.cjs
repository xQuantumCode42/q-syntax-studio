const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const LANGUAGES = ['python', 'javascript', 'csharp', 'rust', 'java', 'haskell'];
const LIMIT = 65536;
let activeChild = null;
let busy = false;

function killTree(child) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => child.kill());
    killer.on('exit', code => { if (code !== 0) child.kill(); });
    const fallback = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 500);
    fallback.unref();
  } else child.kill('SIGKILL');
}

function execute(command, args, options = {}) {
  const start = performance.now();
  return new Promise(resolve => {
    let stdout = '', stderr = '', timedOut = false, settled = false, outputLimited = false;
    const child = spawn(command, args, {
      cwd: options.cwd, windowsHide: true, shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', PYTHONIOENCODING: 'utf-8', ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    activeChild = child;
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, options.timeout || 3500);
    const finish = exitCode => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (activeChild === child) activeChild = null;
      resolve({ stdout, stderr, exitCode: outputLimited ? -1 : exitCode, timedOut, duration: Math.round(performance.now() - start) });
    };
    for (const [stream, key] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        if (outputLimited) return;
        if (key === 'stdout') stdout = (stdout + chunk).slice(0, LIMIT);
        else stderr = (stderr + chunk).slice(0, LIMIT);
        if (stdout.length + stderr.length >= LIMIT) {
          outputLimited = true;
          stderr = stderr.slice(0, LIMIT - 100) + '\n輸出超過 64 KB 上限，已停止執行。';
          killTree(child);
        }
      });
    }
    child.on('error', error => { stderr = error.message; finish(-1); });
    child.on('close', finish);
    child.stdin.on('error', () => {});
    child.stdin.end(options.stdin ?? '');
  });
}

async function firstWorking(candidates) {
  for (const [command, args] of candidates) {
    const result = await execute(command, args, { timeout: 8000 });
    if (result.exitCode === 0) {
      return { available: true, command, args: args.slice(0, -1), version: (result.stdout || result.stderr).trim().split(/\r?\n/)[0] };
    }
  }
  return { available: false, version: '尚未偵測到執行環境' };
}

let runtimeCache;
async function detectRuntimes(refresh = false) {
  if (runtimeCache && !refresh) return runtimeCache;
  const localTools = process.env.STUDIO_TOOLCHAIN_ROOT || path.join(__dirname, '..', '.tools');
  // Sequential detection keeps the active process handle unambiguous.
  const python = await firstWorking([['python', ['--version']], ['py', ['-3', '--version']], [path.join(localTools, 'python', 'python.exe'), ['--version']]]);
  const rust = await firstWorking([['rustc', ['--version']], [path.join(os.homedir(), '.cargo', 'bin', 'rustc.exe'), ['--version']], [path.join(localTools, 'rustup', 'toolchains', 'stable-x86_64-pc-windows-msvc', 'bin', 'rustc.exe'), ['--version']]]);
  const java = await firstWorking([['java', ['-version']]]);
  const javac = await firstWorking([['javac', ['-version']]]);
  const haskell = await firstWorking([['ghc', ['--version']]]);
  const csharp = await firstWorking([['dotnet', ['--version']]]);
  runtimeCache = { python, rust, java: { ...java, available: java.available && javac.available, compiler: javac.command }, haskell, csharp, javascript: { available: true, command: process.execPath, version: `Node.js ${process.versions.node} · 內建` } };
  return runtimeCache;
}

function validateSubmission(input) {
  if (!input || !LANGUAGES.includes(input.language) || typeof input.code !== 'string' || input.code.length > 100000) throw new Error('程式內容或語言格式不正確。');
}

async function prepare(language, code, cwd, runtimes) {
  const runtime = runtimes[language];
  if (!runtime.available) throw new Error('尚未安裝此語言的執行環境。請到「環境與設定」查看安裝指引。');
  const write = (name, text) => fs.writeFile(path.join(cwd, name), text, 'utf8');
  const exe = path.join(cwd, process.platform === 'win32' ? 'program.exe' : 'program');
  let compiled;
  if (language === 'javascript') { await write('main.cjs', code); return { command: process.execPath, args: [path.join(cwd, 'main.cjs')] }; }
  if (language === 'python') { await write('main.py', code); return { command: runtime.command, args: [...(runtime.args || []), '-I', path.join(cwd, 'main.py')] }; }
  if (language === 'rust') {
    await write('main.rs', code);
    compiled = await execute(runtime.command, ['--edition=2024', 'main.rs', '-o', exe], { cwd, timeout: 30000 });
  }
  if (language === 'haskell') {
    await write('Main.hs', code);
    compiled = await execute(runtime.command, ['-v0', 'Main.hs', '-o', exe], { cwd, timeout: 30000 });
  }
  if (language === 'java') {
    await write('Main.java', code);
    compiled = await execute(runtime.compiler, ['-encoding', 'UTF-8', 'Main.java'], { cwd, timeout: 30000 });
    if (compiled.exitCode === 0) return { command: runtime.command, args: ['-ea', '-Dfile.encoding=UTF-8', '-cp', cwd, 'Main'], compilation: compiled };
  }
  if (language === 'csharp') {
    const major = Number.parseInt(runtime.version, 10);
    if (!Number.isFinite(major) || major < 6) throw new Error('需要 .NET SDK 6 或以上版本。');
    await write('Program.cs', code);
    await write('Practice.csproj', `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net${major}.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable><RestoreIgnoreFailedSources>true</RestoreIgnoreFailedSources></PropertyGroup></Project>`);
    // No third-party packages; prevent NuGet network access during local builds.
    await write('NuGet.Config', '<configuration><packageSources><clear /></packageSources></configuration>');
    compiled = await execute(runtime.command, ['build', 'Practice.csproj', '--nologo', '-v:q', '-o', 'out', '-p:UseSharedCompilation=false', `-p:RestoreConfigFile=${path.join(cwd, 'NuGet.Config')}`], { cwd, timeout: 45000, env: { DOTNET_CLI_HOME: cwd, DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: 'false', DOTNET_CLI_UI_LANGUAGE: 'en', NUGET_PACKAGES: path.join(cwd, '.nuget') } });
    if (compiled.exitCode === 0) return { command: runtime.command, args: [path.join(cwd, 'out', 'Practice.dll')], compilation: compiled };
  }
  if (compiled?.exitCode !== 0 || compiled?.timedOut) return { failed: compiled };
  return { command: exe, args: [], compilation: compiled };
}

const normalize = value => value.replace(/\r\n/g, '\n').trimEnd();
async function runSubmission(input, cases) {
  validateSubmission(input);
  if (busy) throw new Error('另一個程式正在執行，請稍候。');
  if (!Array.isArray(cases) || cases.length < 1 || cases.length > 12 || cases.some(c => typeof c.input !== 'string' || c.input.length > 5000 || typeof c.expected !== 'string' || c.expected.length > 5000)) throw new Error('測試資料格式不正確。');
  busy = true;
  let cwd;
  try {
    const runtimes = await detectRuntimes();
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'syntax-studio-'));
    const prepared = await prepare(input.language, input.code, cwd, runtimes);
    const results = [];
    for (const test of cases) {
      const result = prepared.failed || await execute(prepared.command, prepared.args, { cwd, stdin: test.input + '\n' });
      const passed = result.exitCode === 0 && !result.timedOut && normalize(result.stdout) === normalize(test.expected);
      results.push({ ...result, ...test, passed });
      if (prepared.failed) break;
    }
    return { passed: results.length === cases.length && results.every(r => r.passed), results };
  } finally {
    busy = false;
    if (cwd) await fs.rm(cwd, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}

function stop() { killTree(activeChild); }
module.exports = { execute, detectRuntimes, runSubmission, normalize, validateSubmission, stop };
