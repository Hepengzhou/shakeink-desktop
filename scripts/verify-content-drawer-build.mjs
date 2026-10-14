import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const label = process.argv[2];
const mode = process.argv[3] ?? 'build';
if (!['build', '--typecheck-only'].includes(mode)) throw Error('Unsupported validation mode');
if (!label || !/^[a-z0-9-]+$/.test(label)) throw Error('Specify an immutable evidence label');
if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('Node 24 required');
const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .filter(entry => !['generated', 'retired'].includes(entry.name))
  .map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name)))).flat();
const paths = (await Promise.all(['src', 'desktop', 'tests'].map(walk))).flat()
  .filter(path => /\.(?:tsx?|css)$/.test(path));
paths.push(...(await walk('scripts')).filter(path => /\.mjs$/.test(path)),
  'package.json', 'package-lock.json', 'prisma/schema.prisma',
  'next.config.mjs', 'postcss.config.mjs', 'tsconfig.json');
const hashes = async () => Object.fromEntries(await Promise.all([...new Set(paths)].sort().map(async path =>
  [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
const sanitize = value => String(value).replaceAll(process.cwd(), '<repo>')
  .replaceAll(tmpdir(), '<isolated-temp>').replaceAll(homedir(), '<home>')
  .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '<synthetic-key-shaped-value>');
const directory = resolve('docs/evidence/content-drawer', label);
await mkdir(resolve('docs/evidence/content-drawer'), { recursive: true });
await mkdir(directory);
const before = await hashes();
const generatedCatalog = 'desktop/shared/command-catalogs.generated.json';
const generatedHashBefore = createHash('sha256').update(await readFile(generatedCatalog)).digest('hex');
const report = { label, mode, node: process.version, startedAt: new Date().toISOString(), stages: [], sourceHashesBefore: before,
  inventoryScope: 'Recorded src/desktop/tests TS/CSS excluding generated/retired, scripts MJS and listed build configurations. This does not attest every transitive build input.',
  generatedCatalog: { path: generatedCatalog, before: generatedHashBefore } };
const stages = [
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['generate-commands', ['scripts/generate-command-catalogs.mjs']],
  ['generate', ['node_modules/prisma/build/index.js', 'generate', '--schema', 'prisma/schema.prisma']],
  ['ui', ['node_modules/next/dist/bin/next', 'build']],
  ['desktop', ['scripts/build-desktop.mjs']],
];
if (mode === '--typecheck-only') stages.splice(1);
for (const [stage, args] of stages) {
  console.log(`Starting ${stage}`);
  const startedAt = new Date().toISOString();
  let output = '', error = null;
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PATH: `${dirname(process.execPath)};${process.env.PATH ?? ''}`, NEXT_TELEMETRY_DISABLED: '1',
      XAANINK_TEST_CHROMIUM: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk.toString(); });
  const exitCode = await new Promise(done => { child.on('error', value => { error = sanitize(value); done(null); }); child.on('close', done); });
  await writeFile(join(directory, `${stage}.log`), sanitize(output));
  report.stages.push({ stage, command: args, startedAt, finishedAt: new Date().toISOString(), exitCode, error });
  console.log(`${stage}: exit ${exitCode}`);
  if (exitCode !== 0) { process.exitCode = exitCode ?? 1; break; }
}
report.sourceHashesAfter = await hashes();
report.stableSources = JSON.stringify(before) === JSON.stringify(report.sourceHashesAfter);
report.finishedAt = new Date().toISOString();
report.generatedCatalog.after = createHash('sha256').update(await readFile(generatedCatalog)).digest('hex');
report.passed = report.stages.length === stages.length && report.stages.every(stage => stage.exitCode === 0) && report.stableSources;
report.artifactHashes = {};
for (const path of ['dist/main/index.cjs', 'dist/service/index.cjs', 'dist/preload/index.cjs', 'out/index.html']) {
  try { report.artifactHashes[path] = createHash('sha256').update(await readFile(path)).digest('hex'); } catch { report.artifactHashes[path] = null; }
}
if (Object.values(report.artifactHashes).some(value => !value)) report.passed = false;
await writeFile(join(directory, 'build.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ label, passed: report.passed, stableSources: report.stableSources, stages: report.stages }));
if (!report.passed) process.exitCode ||= 1;
