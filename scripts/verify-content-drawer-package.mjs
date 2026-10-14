import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const label = process.argv[2];
if (!label || !/^[a-z0-9-]+$/.test(label)) throw Error('Specify an immutable evidence label');
if (process.platform !== 'win32' || Number(process.versions.node.split('.')[0]) !== 24) throw Error('Windows Node 24 required');
const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .filter(entry => !['generated', 'retired'].includes(entry.name))
  .map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name)))).flat();
const sources = (await Promise.all(['src', 'desktop'].map(walk))).flat()
  .filter(path => /\.(?:tsx?|css)$/.test(path));
sources.push('desktop/shared/command-catalogs.generated.json', 'scripts/package-desktop.mjs',
  'scripts/prepare-package-resources.mjs', 'scripts/inspect-packaged-app.mjs',
  'scripts/packaging-runtime.mjs', 'electron-builder.config.cjs', 'package.json', 'package-lock.json');
const hashes = async () => Object.fromEntries(await Promise.all(sources.sort().map(async path =>
  [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
const sanitize = value => String(value).replaceAll(process.cwd(), '<repo>')
  .replaceAll(tmpdir(), '<isolated-temp>').replaceAll(homedir(), '<home>')
  .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '<synthetic-key-shaped-value>');
const directory = resolve('docs/evidence/content-drawer', label);
await mkdir(resolve('docs/evidence/content-drawer'), { recursive: true });
await mkdir(directory);
const before = await hashes();
const report = { label, node: process.version, startedAt: new Date().toISOString(), stages: [], sourceHashesBefore: before,
  scope: 'Windows directory packaging and packaging test suite; native acceptance is separate. Hash stability applies to recorded source inputs.' };
const packageTests = ['tests/unit/packaging-config.test.ts', ...(await walk('tests/packaging')).filter(path => path.endsWith('.test.ts')).sort()];
const stages = [ ['package-directory', ['scripts/package-desktop.mjs', '--dir']],
  ['packaging-tests', ['--import', 'tsx', '--test', '--test-reporter=tap', '--test-force-exit', '--test-concurrency=1', '--test-timeout=100000', ...packageTests]] ];
for (const [stage, args] of stages) {
  console.log(`Starting ${stage}`);
  const startedAt = new Date().toISOString();
  let output = '', error = null;
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: `${dirname(process.execPath)};${process.env.PATH ?? ''}`, XAANINK_TEST_CHROMIUM: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk.toString(); });
  const exitCode = await new Promise(done => { child.on('error', value => { error = sanitize(value); done(null); }); child.on('close', done); });
  const clean = sanitize(output); await writeFile(join(directory, `${stage}.log`), clean);
  const counts = stage === 'packaging-tests' ? Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key =>
    [key, Number([...clean.matchAll(new RegExp('^# ' + key + ' (\\d+)', 'gm'))].at(-1)?.[1] ?? NaN)])) : null;
  report.stages.push({ stage, command: args, startedAt, finishedAt: new Date().toISOString(), exitCode, error, counts });
  console.log(`${stage}: exit ${exitCode}`);
  if (exitCode !== 0) { process.exitCode = exitCode ?? 1; break; }
}
report.sourceHashesAfter = await hashes();
report.stableSources = JSON.stringify(before) === JSON.stringify(report.sourceHashesAfter);
report.finishedAt = new Date().toISOString();
report.passed = report.stages.length === stages.length && report.stages.every(stage => stage.exitCode === 0) && report.stableSources;
report.executable = 'release/win-unpacked/玄印写作.exe';
try { report.executableHash = createHash('sha256').update(await readFile(report.executable)).digest('hex'); }
catch { report.executableHash = null; report.passed = false; }
try { await writeFile(join(directory, 'package-static.json'), await readFile('release/package-static-win32-x64.json')); }
catch { report.passed = false; }
await writeFile(join(directory, 'package.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ label, passed: report.passed, stableSources: report.stableSources, stages: report.stages }));
if (!report.passed) process.exitCode ||= 1;
