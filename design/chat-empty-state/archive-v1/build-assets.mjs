import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Local, reproducible design assets. Nothing reads app data or contacts a service.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const assetsDirectory = path.join(directory, 'assets');
const fps = 20;
const tau = Math.PI * 2;
const palettes = {
  paper: {
    background: '#f0e7d1', text: '#2b251b', secondary: '#786e5d',
    logo: '#b03524', book: '#bd513c', bookDark: '#933b2e', bookLight: '#e49879', page: '#fff2d9',
    world: '#368b76', worldDark: '#216756', worldLight: '#a7ceae', orbit: '#77ad91', star: '#dcb366',
    character: '#8b6bad', characterDark: '#684583', characterLight: '#c5a9d5', face: '#e5c4c1',
    sun: '#d9a148', landscape: '#68846b', landscapeLight: '#a0ae78', landscapeDark: '#436955',
  },
  ink: {
    background: '#0d0b0a', text: '#ece7e1', secondary: '#b6aa9a',
    logo: '#e07a5f', book: '#de795f', bookDark: '#af5344', bookLight: '#f2ad8d', page: '#ffe8c8',
    world: '#66b69b', worldDark: '#358b76', worldLight: '#b5ddbd', orbit: '#77ae95', star: '#edc987',
    character: '#ba93d5', characterDark: '#8960aa', characterLight: '#dec1ea', face: '#f1cdcb',
    sun: '#e8ba68', landscape: '#8ba481', landscapeLight: '#c0cb96', landscapeDark: '#5b8a71',
  },
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const number = (value) => Number(value.toFixed(5));
const svg = (label, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}"><title>${label}</title>${contents}</svg>\n`;

function logoFrame(source, frame, frameCount) {
  // Return the original bytes at frame zero, including all transform attributes.
  if (frame === 0) return source;
  const phase = tau * frame / frameCount;
  const matched = source.match(/<path\s+d="([^"]+)"/);
  assert.ok(matched, 'The brand SVG must contain a path with d first.');
  const tokens = matched[1].match(/[A-Za-z]|-?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g);
  assert.ok(tokens.every((token) => !/[A-Za-z]/.test(token) || ['M', 'C', 'Z'].includes(token)), 'Review any new brand path commands before regeneration.');
  const warped = [];
  for (let i = 0; i < tokens.length;) {
    if (['M', 'C', 'Z'].includes(tokens[i])) {
      warped.push(tokens[i++]);
      continue;
    }
    const x = Number(tokens[i]);
    const y = Number(tokens[i + 1]);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), 'Every path coordinate must be a pair.');
    if (y >= 235) {
      // Keep the original tokens, not merely their numeric equivalents.
      warped.push(tokens[i], tokens[i + 1]);
    } else {
      const distance = Math.max(0, Math.min(1, (235 - y) / 150));
      const envelope = distance * distance * (3 - 2 * distance);
      const wave = Math.sin(phase) * Math.cos(y / 95) + (1 - Math.cos(phase)) * 0.35 * Math.sin(y / 95);
      warped.push(String(number(x + 12 * envelope * wave)), tokens[i + 1]);
    }
    i += 2;
  }
  return source.replace(matched[1], warped.join(' '));
}

function iconFrame(name, palette, frame, frameCount) {
  const p = palette;
  const phase = tau * frame / frameCount;
  if (name === 'book') {
    // One flexible page changes shape; the cover, spine, and pen remain fixed.
    const turn = (1 - Math.cos(phase)) / 2;
    const edge = number(70 - turn * 13);
    const fold = number(57 - turn * 5);
    return svg('创建作品 · 书页', `
  <path fill="${p.bookDark}" d="M15 30Q15 26 20 26H43Q48 26 49 31Q50 26 56 26H75Q80 26 80 31V74Q65 69 49 76Q31 69 15 74Z"/>
  <path fill="${p.book}" d="M15 31Q32 27 47 34V71Q31 65 15 70Z"/>
  <path fill="${p.page}" d="M21 23Q35 22 46 30V65Q34 58 21 60Z"/>
  <path fill="${p.bookLight}" d="M51 31Q64 23 75 25V63Q63 62 51 69Z"/>
  <path fill="${p.page}" d="M50 30Q${fold} 21 ${edge} 21V58Q${fold} 59 50 68Z"/>
  <path fill="${p.bookDark}" d="M47 33H51V73H47Z"/>
  <path fill="${p.bookLight}" d="M24 33Q33 32 40 36V39Q32 35 24 36ZM24 43Q33 42 40 46V49Q32 45 24 46Z"/>
  <g transform="rotate(28 76 42)"><rect x="72" y="13" width="8" height="42" rx="3" fill="${p.book}"/><path fill="${p.bookDark}" d="M72 48H80V55L76 64L72 55Z"/><path fill="${p.page}" d="M74 55H78L76 61Z"/><path fill="${p.bookLight}" d="M74 17H76V44H74Z"/></g>`);
  }
  if (name === 'world') {
    const starX = number(48 + 36 * Math.cos(phase - Math.PI / 3));
    const starY = number(48 + 20 * Math.sin(phase - Math.PI / 3));
    return svg('新世界观 · 星球', `
  <path fill="${p.orbit}" fill-rule="evenodd" d="M9 49C9 34 30 25 51 25S89 34 89 48S69 70 48 70S9 63 9 49ZM13 49C13 59 29 66 48 66S85 58 85 48S70 29 51 29S13 38 13 49Z" transform="rotate(-24 48 48)"/>
  <circle cx="48" cy="48" r="27" fill="${p.world}"/>
  <path fill="${p.worldLight}" d="M31 28Q42 18 55 24L53 33L59 39L53 48L43 45L40 51L32 46L29 37ZM47 56L56 52L65 57L63 64L55 71L49 71L45 64Z"/>
  <path fill="${p.worldDark}" d="M27 62Q39 77 58 69Q73 61 73 43Q79 63 63 73Q42 84 27 62Z"/>
  <path fill="${p.star}" d="M0 -7L2.4 -2.4L7 0L2.4 2.4L0 7L-2.4 2.4L-7 0L-2.4 -2.4Z" transform="translate(${starX} ${starY})"/>`);
  }
  if (name === 'character') {
    // Only the head group rotates; the body and the small authoring spark stay put.
    const angle = number(Math.sin(phase) * 5);
    return svg('新角色 · 人物', `
  <path fill="${p.character}" d="M23 77Q22 60 32 55Q40 50 48 51Q60 50 68 58Q74 64 74 77Q49 85 23 77Z"/>
  <path fill="${p.characterDark}" d="M48 60L54 79Q63 80 74 77Q74 63 67 57L59 53Z"/>
  <path fill="${p.characterLight}" d="M35 53L45 60L40 68L29 57ZM59 53L48 60L54 68L65 57Z"/>
  <path fill="${p.face}" d="M41 44H55V56L48 61L41 56Z"/>
  <g transform="rotate(${angle} 48 48)"><path fill="${p.characterDark}" d="M30 33Q29 17 47 17Q66 16 66 33V45Q64 52 57 53H35Q29 47 30 33Z"/><path fill="${p.face}" d="M35 32Q40 33 47 25Q54 34 60 32V40Q58 50 48 52Q38 51 35 42Z"/><path fill="${p.character}" d="M31 32Q29 21 40 17Q50 12 60 21Q66 26 65 35Q54 34 48 25Q43 33 31 35Z"/></g>
  <path fill="${p.characterLight}" d="M78 30L80.5 36.5L87 39L80.5 41.5L78 48L75.5 41.5L69 39L75.5 36.5Z"/>`);
  }
  if (name === 'scene') {
    const sunY = number(31 - (1 - Math.cos(phase)) * 3);
    return svg('新场景 · 山峦日轮', `
  <circle cx="62" cy="${sunY}" r="15" fill="${p.sun}"/>
  <path fill="${p.landscapeLight}" d="M43 67L63 39Q65 36 68 40L88 69Q90 74 84 74H41Z"/>
  <path fill="${p.landscape}" d="M10 67L32 31Q35 26 39 32L68 75H14Q6 75 10 67Z"/>
  <path fill="${p.landscapeDark}" d="M35 31L40 54L54 75H68Z"/>
  <path fill="${p.page}" d="M32 31Q35 27 39 32L45 41L39 39L35 43L30 40L26 41Z"/>
  <path fill="${p.landscapeLight}" d="M13 69Q28 59 45 70Q64 81 87 67V75H13Z"/>`);
  }
  throw new Error(`Unknown icon: ${name}`);
}

async function raster(source, size) {
  return sharp(Buffer.from(source)).resize(size, size).ensureAlpha().raw().toBuffer();
}

function compareRegions(reference, candidate, width, startY = 0, endY = width) {
  let changedPixels = 0;
  for (let y = startY; y < endY; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (reference[offset] !== candidate[offset] || reference[offset + 1] !== candidate[offset + 1] || reference[offset + 2] !== candidate[offset + 2] || reference[offset + 3] !== candidate[offset + 3]) changedPixels++;
    }
  }
  return changedPixels;
}

await mkdir(assetsDirectory, { recursive: true });
const manifest = {
  version: 1,
  generator: 'design/chat-empty-state/build-assets.mjs',
  generationMethod: 'Local SVG authoring and sharp rasterization; no network, external image generation, credentials, or application data.',
  fps,
  spriteLayout: 'horizontal; frame n begins at x = n × frameWidth',
  alpha: true,
  logoMotion: { coordinateBoundaryY: 235, fixedRasterRegion: { x: 0, y: 91, width: 192, height: 101 }, method: 'Only x coordinates above source y=235 vary; smoothstep envelope becomes zero at the boundary. Original SVG transforms are retained.' },
  palettes,
  assets: [],
  checks: [],
};
const generated = new Map();

for (const [theme, palette] of Object.entries(palettes)) {
  for (const name of ['logo', 'book', 'world', 'character', 'scene']) {
    const size = name === 'logo' ? 192 : 96;
    const frameCount = name === 'logo' ? 64 : 24;
    const stem = `${name}-${theme}`;
    const relativeSource = name === 'logo' ? `public/brand/logo-icon-${theme}.svg` : 'design/chat-empty-state/build-assets.mjs';
    const source = name === 'logo' ? await readFile(path.join(repository, relativeSource), 'utf8') : null;
    const sourceHash = name === 'logo' ? hash(source) : null;
    const frameSvg = (frame) => name === 'logo' ? logoFrame(source, frame, frameCount) : iconFrame(name, palette, frame, frameCount);
    const firstSvg = frameSvg(0);
    if (source !== null) assert.equal(firstSvg, source, `${stem}: frame-zero SVG must be byte-identical to the original.`);
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) frames.push(await raster(frameSvg(frame), size));

    const changedPixelsByFrame = frames.map((frame) => compareRegions(frames[0], frame, size));
    assert.ok(changedPixelsByFrame.slice(1).some((count) => count > 0), `${stem}: a hover animation must change pixels.`);
    const checks = { sprite: `${stem}.png`, frameZeroMatchesStaticSvg: true, animationChangesPixels: true, changedPixelsVsFrameZero: changedPixelsByFrame };
    if (name === 'logo') {
      const fixedRegionChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, 91));
      const smokeChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, 0, 91));
      assert.ok(fixedRegionChangedPixels.every((count) => count === 0), `${stem}: the incense burner must be pixel-identical throughout the animation.`);
      assert.ok(smokeChangedPixels.slice(1).every((count) => count > 0), `${stem}: each nonzero smoke frame must differ from the original.`);
      Object.assign(checks, { originalSvgSha256: sourceHash, staticSvgByteIdenticalToOriginal: true, fixedRegionChangedPixels, smokeChangedPixels, burnerFixedAllFrames: true, smokeChangesAllNonzeroFrames: true });
    }

    await writeFile(path.join(assetsDirectory, `${stem}.svg`), firstSvg);
    const firstPng = await sharp(frames[0], { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    await writeFile(path.join(assetsDirectory, `${stem}-first.png`), firstPng);
    // Copy raw rows into their cells so composition never changes alpha-edge RGB.
    const spritePixels = Buffer.alloc(size * frameCount * size * 4);
    for (let frame = 0; frame < frameCount; frame++) {
      for (let y = 0; y < size; y++) {
        frames[frame].copy(spritePixels, (y * size * frameCount + frame * size) * 4, y * size * 4, (y + 1) * size * 4);
      }
    }
    const sprite = await sharp(spritePixels, { raw: { width: size * frameCount, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(path.join(assetsDirectory, `${stem}.png`), sprite);
    // Validate the written sprite, not merely the source buffers used to build it.
    const decodedSprite = await sharp(sprite).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(decodedSprite.info.width, size * frameCount);
    assert.equal(decodedSprite.info.height, size);
    let decodedMismatchPixels = 0;
    for (let frame = 0; frame < frameCount; frame++) {
      for (let y = 0; y < size; y++) {
        const spriteStart = (y * size * frameCount + frame * size) * 4;
        const frameStart = y * size * 4;
        const writtenRow = decodedSprite.data.subarray(spriteStart, spriteStart + size * 4);
        const originalRow = frames[frame].subarray(frameStart, frameStart + size * 4);
        for (let x = 0; x < size; x++) {
          const o = x * 4;
          if (!writtenRow.subarray(o, o + 4).equals(originalRow.subarray(o, o + 4))) decodedMismatchPixels++;
        }
      }
    }
    assert.equal(decodedMismatchPixels, 0, `${stem}: PNG sprite must preserve all generated RGBA pixels.`);
    Object.assign(checks, { decodedSpriteMismatchPixels: decodedMismatchPixels, passed: true });
    manifest.checks.push(checks);
    manifest.assets.push({ name, theme, sprite: `${stem}.png`, staticSvg: `${stem}.svg`, firstFrame: `${stem}-first.png`, frameWidth: size, frameHeight: size, frameCount, fps, durationMs: frameCount / fps * 1000, width: size * frameCount, height: size, source: relativeSource, ...(sourceHash ? { sourceSha256: sourceHash } : {}), spriteSha256: hash(sprite), bytes: sprite.length, colors: name === 'logo' ? [palette.logo] : [...new Set(firstSvg.match(/#[\da-f]{6}/gi))] });
    generated.set(stem, { frames, size, frameCount });
    console.log(`${stem}: ${frameCount} frames × ${size}px; ${sprite.length} bytes; pixel checks passed`);
  }
}

// Contact sheet uses actual intended display sizes and four discrete frame samples.
const sheetWidth = 1060;
const sheetHeight = 750;
const placements = [];
let labels = '';
for (const [column, theme] of ['paper', 'ink'].entries()) {
  const palette = palettes[theme];
  const originX = column * 530;
  labels += `<rect x="${originX}" width="530" height="750" fill="${palette.background}"/><text x="${originX + 28}" y="40" fill="${palette.text}" font-size="19" font-weight="600">${theme === 'paper' ? 'PAPER' : 'INK'} / hover frame samples</text>`;
  for (let sample = 0; sample < 4; sample++) labels += `<text x="${originX + 106 + sample * 110}" y="73" fill="${palette.secondary}" font-size="12" text-anchor="middle">${sample * 25}%</text>`;
  for (const [row, name] of ['logo', 'book', 'world', 'character', 'scene'].entries()) {
    const { frames, size, frameCount } = generated.get(`${name}-${theme}`);
    const displaySize = name === 'logo' ? 96 : name === 'book' ? 48 : 36;
    const rowTop = 96 + row * 124;
    labels += `<text x="${originX + 28}" y="${rowTop + 110}" fill="${palette.secondary}" font-size="12">${name} / ${displaySize}px</text>`;
    for (let sample = 0; sample < 4; sample++) {
      const frame = Math.floor(frameCount * sample / 4);
      const input = await sharp(frames[frame], { raw: { width: size, height: size, channels: 4 } }).resize(displaySize, displaySize).png().toBuffer();
      placements.push({ input, left: originX + 106 + sample * 110 - displaySize / 2, top: rowTop + (96 - displaySize) / 2 });
    }
  }
}
const contactSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}"><g font-family="Arial, sans-serif">${labels}</g></svg>`;
await sharp(Buffer.from(contactSvg)).composite(placements).png().toFile(path.join(assetsDirectory, 'contact-sheet.png'));
manifest.contactSheet = 'contact-sheet.png';
manifest.verification = { executed: true, command: 'node design/chat-empty-state/build-assets.mjs', allChecksPassed: manifest.checks.every((check) => check.passed), scope: 'Generated design assets only; not business, Electron, or target-system acceptance.' };
await writeFile(path.join(assetsDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.assets.length} sprite sets, static sources, first frames, contact sheet, and manifest.`);
