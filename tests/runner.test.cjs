const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { runSubmission, detectRuntimes, normalize, validateSubmission } = require('../electron/runner.cjs');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { languages, topics, lessonFor, migrateProgress } = require('../src/curriculum.ts');
let runtimes;
before(async () => { runtimes = await detectRuntimes(); });

test('reject unsupported languages and malformed submissions', () => {
  assert.throws(() => validateSubmission({ language: 'powershell', code: 'echo no' }));
  assert.throws(() => validateSubmission({ language: 'javascript', code: 123 }));
  assert.throws(() => validateSubmission({ language: 'javascript', code: 'x'.repeat(100001) }));
});

test('normalize platform line endings, preserve meaningful leading whitespace', () => {
  assert.equal(normalize('12\r\n'), '12');
  assert.notEqual(normalize(' 12'), '12');
});

test('126 topic exercises have complete teaching, references, distinct starter and solution', () => {
  assert.equal(languages.length * topics.length, 126);
  for (const language of languages) for (const topic of topics) {
    const lesson = lessonFor(language.id, topic.id);
    assert.ok(lesson.points.length >= 3);
    assert.ok(lesson.exerciseTitle);
    assert.ok(lesson.sections.length >= 2);
    assert.ok(lesson.tests.length >= 3);
    assert.ok(lesson.source.startsWith('https://'));
    assert.notEqual(lesson.starter, lesson.solution);
  }
});

for (const language of languages) {
  for (const topic of topics) {
    test(`${language.name} / ${topic.name}: reference solution passes actual tests`, { timeout: 90000 }, async t => {
      if (!runtimes[language.id].available) { t.skip(`${language.name} runtime is not installed`); return; }
      const lesson = lessonFor(language.id, topic.id);
      const result = await runSubmission({ language: language.id, code: lesson.solution }, lesson.tests);
      assert.equal(result.passed, true, JSON.stringify(result.results, null, 2));
    });
  }
}

test('incorrect code fails rather than accepting a plausible-looking answer', async () => {
  const result = await runSubmission({ language: 'javascript', code: 'console.log(80);' }, lessonFor('javascript', 'branches').tests);
  assert.equal(result.passed, false);
  assert.equal(result.results.filter(r => r.passed).length, 2);
});

test('syntax errors retain diagnostic output and fail verification', async () => {
  const result = await runSubmission({ language: 'javascript', code: 'const = ;' }, [{ input: '', expected: '', label: 'syntax error' }]);
  assert.equal(result.passed, false);
  assert.match(result.results[0].stderr, /SyntaxError/);
});

test('infinite loop is stopped and does not pass', { timeout: 15000 }, async () => {
  const result = await runSubmission({ language: 'javascript', code: 'while (true) {}' }, [{ input: '', expected: '', label: 'timeout' }]);
  assert.equal(result.passed, false);
  assert.equal(result.results[0].timedOut, true);
});

test('excessive output is bounded and terminated', { timeout: 15000 }, async () => {
  const result = await runSubmission({ language: 'javascript', code: 'while (true) console.log("x".repeat(10000));' }, [{ input: '', expected: '', label: 'output limit' }]);
  assert.equal(result.passed, false);
  assert.ok(result.results[0].stdout.length <= 65536);
});

test('removed topic selection migrates while all previous drafts remain intact', () => {
  const saved = { selectedLanguage: 'rust', selectedTopic: 'capstone', drafts: { 'rust:capstone': 'old draft', 'rust:branches': 'keep this too' }, completed: ['rust:capstone', 'rust:branches'], hints: {} };
  const migrated = migrateProgress(saved);
  assert.equal(migrated.selectedTopic, 'bindings');
  assert.deepEqual(migrated.drafts, saved.drafts);
  assert.deepEqual(migrated.completed, saved.completed);
  assert.equal(topics.some(t => t.id === 'capstone'), false);
});

test('Java assertions are actually enabled by the runner', async t => {
  if (!runtimes.java.available) { t.skip('Java is not installed'); return; }
  const result = await runSubmission({ language: 'java', code: 'public class Main { public static void main(String[] args) { assert false; System.out.println(42); } }' }, [{ input: '', expected: '42', label: 'failing assertion' }]);
  assert.equal(result.passed, false);
  assert.match(result.results[0].stderr, /AssertionError/);
});

