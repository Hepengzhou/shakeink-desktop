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
const tau = Math.PI * 2;
const logoViewBox = '-14 -24 156 156';
const fixedRasterRegion = { x: 0, y: 104, width: 192, height: 88 };
const motion = { horizontalCoefficient: 72, verticalRise: 78, verticalWave: 12, sourceBoundaryY: 235 };
const palettes = {
  paper: {
    background: '#f0e7d1', text: '#2b251b', secondary: '#786e5d',
    logo: '#b8b8b8', icon: '#686868',
  },
  ink: {
    background: '#0d0b0a', text: '#ece7e1', secondary: '#b6aa9a',
    logo: '#d0d0d0', icon: '#c1c1c1',
  },
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const number = (value) => Number(value.toFixed(5));
const svg = (label, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}"><title>${label}</title>${contents}</svg>\n`;

function normalizeLogo(source, color) {
  assert.ok(source.includes('viewBox="0 0 128 128"'));
  const fills = source.match(/fill="#[\da-f]{6}"/gi);
  assert.equal(fills?.length, 1, 'Review any brand source with multiple fills.');
  return source.replace('viewBox="0 0 128 128"', `viewBox="${logoViewBox}"`).replace(fills[0], `fill="${color}"`);
}

function displacement(y, phase) {
  if (y >= motion.sourceBoundaryY) return { dx: 0, dy: 0 };
  const distance = Math.max(0, Math.min(1, (motion.sourceBoundaryY - y) / 150));
  const envelope = distance * distance * (3 - 2 * distance);
  const wave = Math.sin(phase) * Math.cos(y / 95) + (1 - Math.cos(phase)) * 0.35 * Math.sin(y / 95);
  return {
    dx: motion.horizontalCoefficient * envelope * wave,
    dy: envelope * (-motion.verticalRise * (1 - Math.cos(phase)) / 2 + motion.verticalWave * Math.sin(phase)),
  };
}

function logoFrame(source, frame, frameCount) {
  // First frame is only recolored/reframed: original path and transforms survive.
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
    if (y >= motion.sourceBoundaryY) {
      // Keep the original tokens, not merely their numeric equivalents.
      warped.push(tokens[i], tokens[i + 1]);
    } else {
      const { dx, dy } = displacement(y, phase);
      warped.push(String(number(x + dx)), String(number(y + dy)));
    }
    i += 2;
  }
  return source.replace(matched[1], warped.join(' '));
}

function iconFrame(name, palette, frame, frameCount) {
  const color = palette.icon;
  const phase = tau * frame / frameCount;
  if (name === 'book') {
    // Newly drawn single-color silhouette. Only the right-hand page flexes.
    const turn = (1 - Math.cos(phase)) / 2;
    const edge = number(89 - turn * 14);
    const inner = number(78 - turn * 10);
    return svg('创建作品 · 书页', `
  <g fill="${color}" fill-rule="evenodd"><path d="M7 16Q28 12 44 24V82Q27 73 7 77ZM17 31Q29 31 36 36V43Q27 38 17 38ZM17 49Q28 49 36 54V61Q26 56 17 56Z"/>
  <path d="M52 24Q68 12 ${edge} 16V77Q68 73 52 82ZM60 35Q68 31 ${inner} 31V38Q69 38 60 42ZM60 53Q69 49 ${inner} 49V56Q70 56 60 60Z"/>
  <path d="M46 27H50V86H46Z"/></g>`);
  }
  if (name === 'world') {
    const starX = number(48 + 38 * Math.cos(phase - Math.PI / 3));
    const starY = number(48 + 27 * Math.sin(phase - Math.PI / 3));
    return svg('新世界观 · 星球', `
  <g fill="${color}" fill-rule="evenodd"><path d="M48 15A33 33 0 1 1 48 81A33 33 0 1 1 48 15ZM32 27L43 22L53 25L50 34L58 39L52 48L40 44L35 52L26 43L26 34ZM47 56L58 51L68 59L61 70L51 75L45 65Z"/>
  <path d="M7 50C7 35 26 26 48 26S89 35 89 50S70 72 48 72S7 65 7 50ZM13 50C13 60 29 66 48 66S83 60 83 50S67 32 48 32S13 40 13 50Z" transform="rotate(-28 48 48)"/>
  <path d="M0 -7L2.5 -2.5L7 0L2.5 2.5L0 7L-2.5 2.5L-7 0L-2.5 -2.5Z" transform="translate(${starX} ${starY})"/></g>`);
  }
  if (name === 'character') {
    // Head tilt is the only moving part; a broad body stays legible at 22px.
    const angle = number(Math.sin(phase) * 9);
    return svg('新角色 · 人物', `
  <g fill="${color}" fill-rule="evenodd"><path d="M48 8C33 8 27 17 28 32C28 47 38 53 48 53C58 53 68 47 68 32C69 17 63 8 48 8ZM36 26Q45 28 53 18Q57 27 62 29V35Q59 47 48 47Q38 47 35 35Z" transform="rotate(${angle} 48 48)"/>
  <path d="M11 87Q10 63 31 57L47 72L65 57Q85 63 85 87ZM38 58H59L48 67Z"/></g>`);
  }
  if (name === 'scene') {
    const sunY = number(25 - (1 - Math.cos(phase)) * 4);
    return svg('新场景 · 山峦日轮', `
  <g fill="${color}"><circle cx="70" cy="${sunY}" r="12"/>
  <path fill-rule="evenodd" d="M6 78L29 30Q32 24 36 30L63 84H10Q3 84 6 78ZM23 54L32 36L42 57L33 51L29 57Z"/>
  <path d="M50 49L58 36Q62 28 66 36L91 77Q95 84 86 84H70Z"/></g>`);
  }
  throw new Error(`Unknown icon: ${name}`);
}

async function raster(source, size, solidColor) {
  const pixels = await sharp(Buffer.from(source)).resize(size, size).ensureAlpha().raw().toBuffer();
  if (solidColor) {
    // SVG overlap may introduce a one-level RGB rounding error. Preserve alpha
    // coverage while making the single declared icon ink exact at every pixel.
    const channels = [1, 3, 5].map((start) => parseInt(solidColor.slice(start, start + 2), 16));
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3]) { pixels[i] = channels[0]; pixels[i + 1] = channels[1]; pixels[i + 2] = channels[2]; }
    }
  }
  return pixels;
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

function pixelStats(pixels, size, endY = size) {
  let xMin = size, xMax = -1, yMin = size, yMax = -1, occupiedPixels = 0, opaquePixels = 0, edgePixels = 0, nonGrayPixels = 0;
  const opaqueColors = new Set();
  for (let y = 0; y < endY; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!pixels[i + 3]) continue;
      occupiedPixels++;
      xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) edgePixels++;
      if (pixels[i] !== pixels[i + 1] || pixels[i] !== pixels[i + 2]) nonGrayPixels++;
      if (pixels[i + 3] === 255) {
        opaquePixels++;
        opaqueColors.add(`#${[pixels[i], pixels[i + 1], pixels[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
      }
    }
  }
  return { bbox: { x: xMin, y: yMin, width: xMax - xMin + 1, height: yMax - yMin + 1 }, occupiedPixels, opaquePixels, opaqueColors: [...opaqueColors], edgePixels, nonGrayPixels };
}

function unionBounds(stats) {
  const x = Math.min(...stats.map(({ bbox }) => bbox.x));
  const y = Math.min(...stats.map(({ bbox }) => bbox.y));
  const right = Math.max(...stats.map(({ bbox }) => bbox.x + bbox.width));
  const bottom = Math.max(...stats.map(({ bbox }) => bbox.y + bbox.height));
  return { x, y, width: right - x, height: bottom - y };
}

function smokeDisplacementStats(source, frameCount) {
  const coordinates = source.match(/<path\s+d="([^"]+)"/)[1].match(/-?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g).map(Number);
  let maxAbsoluteDx = 0, maxAbsoluteDy = 0, minDy = 0, maxDy = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    for (let i = 1; i < coordinates.length; i += 2) {
      const { dx, dy } = displacement(coordinates[i], tau * frame / frameCount);
      maxAbsoluteDx = Math.max(maxAbsoluteDx, Math.abs(dx));
      maxAbsoluteDy = Math.max(maxAbsoluteDy, Math.abs(dy));
      minDy = Math.min(minDy, dy); maxDy = Math.max(maxDy, dy);
    }
  }
  return { maxAbsoluteDx: number(maxAbsoluteDx), maxAbsoluteDy: number(maxAbsoluteDy), minDy: number(minDy), maxDy: number(maxDy), rasterPixelsPerSourceUnit: 0.2354049 * 192 / 156 };
}

await mkdir(assetsDirectory, { recursive: true });
const manifest = {
  version: 2,
  generator: 'design/chat-empty-state/build-assets.mjs',
  generationMethod: 'Local SVG authoring and sharp rasterization; no network, external image generation, credentials, or application data.',
  iconRasterization: 'Preserve SVG alpha coverage, then set RGB of every nontransparent icon pixel to its single declared ink color; this removes overlap-rounding artifacts. Logo is rasterized directly without this step.',
  fpsByType: { logo: 16, icons: 20 },
  spriteLayout: 'horizontal; frame n begins at x = n × frameWidth',
  alpha: true,
  logoNormalization: { originalViewBox: '0 0 128 128', viewBox: logoViewBox, width: 128, height: 128, transforms: 'preserved', originalTransforms: ['translate(0 0) scale(1) translate(0 0)', 'translate(7.03202 1.50000) scale(0.2354049)', 'translate(313,8)'], colors: { paper: palettes.paper.logo, ink: palettes.ink.logo }, allowedChanges: ['Replace root viewBox', 'Replace original single fill color'] },
  logoMotion: { coordinateBoundaryY: motion.sourceBoundaryY, fixedRasterRegion, horizontalAmplitudeSource: motion.horizontalCoefficient, previousHorizontalAmplitudeSource: 12, horizontalCoefficientRatioToV1: motion.horizontalCoefficient / 12, verticalRiseSource: motion.verticalRise, verticalWaveSource: motion.verticalWave, displaySize: 128, method: 'Only original smoke control points at source y<235 vary in x and y. Smoothstep reaches zero at the boundary; original body coordinates and all transforms remain unchanged.', trails: false },
  palettes,
  assets: [],
  checks: [],
};
const generated = new Map();

for (const [theme, palette] of Object.entries(palettes)) {
  for (const name of ['logo', 'book', 'world', 'character', 'scene']) {
    const size = name === 'logo' ? 192 : 96;
    const frameCount = name === 'logo' ? 64 : 24;
    const fps = name === 'logo' ? 16 : 20;
    const stem = `${name}-${theme}`;
    const relativeSource = name === 'logo' ? `public/brand/logo-icon-${theme}.svg` : 'design/chat-empty-state/build-assets.mjs';
    const source = name === 'logo' ? await readFile(path.join(repository, relativeSource), 'utf8') : null;
    const sourceHash = name === 'logo' ? hash(source) : null;
    const normalizedSource = source === null ? null : normalizeLogo(source, palette.logo);
    const frameSvg = (frame) => name === 'logo' ? logoFrame(normalizedSource, frame, frameCount) : iconFrame(name, palette, frame, frameCount);
    const firstSvg = frameSvg(0);
    if (source !== null) {
      assert.equal(firstSvg, normalizedSource, `${stem}: frame zero must equal the normalized brand SVG.`);
      assert.equal(firstSvg.match(/<path\s+d="([^"]+)"/)[1], source.match(/<path\s+d="([^"]+)"/)[1], `${stem}: frame-zero brand path must be unchanged.`);
      assert.deepEqual(firstSvg.match(/transform="[^"]+"/g), source.match(/transform="[^"]+"/g), `${stem}: all brand transforms must survive normalization.`);
    }
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) frames.push(await raster(frameSvg(frame), size, name === 'logo' ? null : palette.icon));

    const changedPixelsByFrame = frames.map((frame) => compareRegions(frames[0], frame, size));
    assert.ok(changedPixelsByFrame.slice(1).some((count) => count > 0), `${stem}: a hover animation must change pixels.`);
    const checks = { sprite: `${stem}.png`, frameZeroMatchesDeclaredRasterization: true, ...(name === 'logo' ? { frameZeroMatchesStaticSvg: true } : {}), animationChangesPixels: true, changedPixelsVsFrameZero: changedPixelsByFrame };
    const allPixelStats = frames.map((frame) => pixelStats(frame, size));
    const expectedColor = name === 'logo' ? palette.logo : palette.icon;
    assert.ok(allPixelStats.every((stats) => stats.nonGrayPixels === 0), `${stem}: every visible pixel must be grayscale.`);
    assert.ok(allPixelStats.every((stats) => stats.edgePixels === 0), `${stem}: all image edges must remain transparent.`);
    assert.ok(allPixelStats.every((stats) => stats.opaqueColors.length === 1 && stats.opaqueColors[0] === expectedColor), `${stem}: only the chosen solid color is allowed.`);
    Object.assign(checks, { grayscaleAllFrames: true, transparentEdgesAllFrames: true, opaqueColorAllFrames: expectedColor, frameZeroBounds: allPixelStats[0].bbox, allFrameBounds: unionBounds(allPixelStats) });
    if (name === 'logo') {
      const fixedRegionChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, fixedRasterRegion.y));
      const smokeChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, 0, fixedRasterRegion.y));
      assert.ok(fixedRegionChangedPixels.every((count) => count === 0), `${stem}: the incense burner must be pixel-identical throughout the animation.`);
      assert.ok(smokeChangedPixels.slice(1).every((count) => count > 0), `${stem}: each nonzero smoke frame must differ from the original.`);
      const smokeStats = frames.map((frame) => pixelStats(frame, size, fixedRasterRegion.y));
      Object.assign(checks, { originalSvgSha256: sourceHash, normalizedSvgSha256: hash(normalizedSource), staticSvgMatchesNormalizedOriginal: true, originalPathAndTransformsPreserved: true, fixedRasterRegion, fixedRegionChangedPixels, smokeChangedPixels, burnerFixedAllFrames: true, smokeChangesAllNonzeroFrames: true, smokeCoverage: { firstFrame: smokeStats[0], unionBounds: unionBounds(smokeStats), frames: smokeStats.map(({ bbox, occupiedPixels }) => ({ bbox, occupiedPixels })), maximumChangedPixelsVsFrameZero: Math.max(...smokeChangedPixels), maximumChangedPixelsAsFractionOfFirstFrameSmoke: Math.max(...smokeChangedPixels) / smokeStats[0].occupiedPixels }, sourceDisplacement: smokeDisplacementStats(source, frameCount) });
    } else {
      assert.equal(new Set(firstSvg.match(/#[\da-f]{6}/gi)).size, 1, `${stem}: SVG must contain one solid color.`);
      assert.ok(!firstSvg.includes('stroke'), `${stem}: icon must be a filled silhouette, without strokes.`);
      Object.assign(checks, { staticSvgSingleSolidColor: true, noSvgStrokes: true });
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
const sheetHeight = 850;
const placements = [];
let labels = '';
for (const [column, theme] of ['paper', 'ink'].entries()) {
  const palette = palettes[theme];
  const originX = column * 530;
  labels += `<rect x="${originX}" width="530" height="${sheetHeight}" fill="${palette.background}"/><text x="${originX + 28}" y="40" fill="${palette.text}" font-size="19" font-weight="600">${theme === 'paper' ? 'PAPER' : 'INK'} / v2 hover frames</text>`;
  for (let sample = 0; sample < 4; sample++) labels += `<text x="${originX + 106 + sample * 110}" y="73" fill="${palette.secondary}" font-size="12" text-anchor="middle">${sample * 25}%</text>`;
  for (const [row, name] of ['logo', 'book', 'world', 'character', 'scene'].entries()) {
    const { frames, size, frameCount } = generated.get(`${name}-${theme}`);
    const displaySize = name === 'logo' ? 128 : name === 'book' ? 28 : 22;
    const rowTop = 92 + row * 144;
    labels += `<text x="${originX + 28}" y="${rowTop + 139}" fill="${palette.secondary}" font-size="12">${name} / ${displaySize}px</text>`;
    for (let sample = 0; sample < 4; sample++) {
      const frame = Math.floor(frameCount * sample / 4);
      const input = await sharp(frames[frame], { raw: { width: size, height: size, channels: 4 } }).resize(displaySize, displaySize).png().toBuffer();
      placements.push({ input, left: originX + 106 + sample * 110 - displaySize / 2, top: rowTop + (128 - displaySize) / 2 });
    }
  }
}
const contactSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}"><g font-family="Arial, sans-serif">${labels}</g></svg>`;
await sharp(Buffer.from(contactSvg)).composite(placements).png().toFile(path.join(assetsDirectory, 'contact-sheet.png'));
manifest.contactSheet = 'contact-sheet.png';
manifest.verification = { executed: true, command: 'node design/chat-empty-state/build-assets.mjs', allChecksPassed: manifest.checks.every((check) => check.passed), scope: 'Generated design assets only; not business, Electron, or target-system acceptance.' };
await writeFile(path.join(assetsDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.assets.length} sprite sets, static sources, first frames, contact sheet, and manifest.`);
