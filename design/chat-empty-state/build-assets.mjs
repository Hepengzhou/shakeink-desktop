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
const motion = {
  sourceBoundaryY: 235,
  packets: [
    { id: 'lower-curl', start: 0, end: 0.69, amplitude: 48, lift: 12, radius: 68, phase: 0.3 },
    { id: 'middle-curl', start: 0.16, end: 0.88, amplitude: -39, lift: 9, radius: 61, phase: -0.5 },
    { id: 'upper-wisp', start: 0.37, end: 0.98, amplitude: 30, lift: 7, radius: 56, phase: 0.65 },
  ],
};
const palettes = {
  paper: {
    background: '#f0e7d1', text: '#2b251b', secondary: '#786e5d',
    logo: '#b6a47c',
    icons: { book: '#a67a39', character: '#9475a8', world: '#4e8b7c', scene: '#698cac' },
    paper: '#fffbef', paperBack: '#e8dcc1', paperEdge: '#d0c1a2',
    book: ['#d8b575', '#ab7c42', '#735530'], character: ['#c9b2d6', '#9f7fb3', '#735889'],
    world: ['#a8c9b9', '#659e8b', '#376e61'], scene: ['#bbd0de', '#7e9fb8', '#496e8a'],
  },
  ink: {
    background: '#0d0b0a', text: '#ece7e1', secondary: '#b6aa9a',
    logo: '#8d8984',
    icons: { book: '#d1aa67', character: '#c3a0d5', world: '#84bba8', scene: '#93b7d0' },
    paper: '#e4ddd1', paperBack: '#6a6053', paperEdge: '#aaa08c',
    book: ['#ccab76', '#a8834c', '#624d33'], character: ['#c4afd1', '#9c7caf', '#615071'],
    world: ['#a7c9bc', '#6c9f90', '#466f64'], scene: ['#b1c9d9', '#7e9fb7', '#4d728b'],
  },
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const number = (value) => Number(value.toFixed(5));
const svg = (label, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}"><title>${label}</title>${contents}</svg>\n`;
const artSvg = (label, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" role="img" aria-label="${label}"><title>${label}</title>${contents}</svg>\n`;
const smoothstep = (value) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

function normalizeLogo(source, color) {
  assert.ok(source.includes('viewBox="0 0 128 128"'));
  const fills = source.match(/fill="#[\da-f]{6}"/gi);
  assert.equal(fills?.length, 1, 'Review any brand source with multiple fills.');
  return source.replace('viewBox="0 0 128 128"', `viewBox="${logoViewBox}"`).replace(fills[0], `fill="${color}"`);
}

function packetAt(packet, time) {
  const age = (time - packet.start) / (packet.end - packet.start);
  const active = age > 0 && age < 1;
  return { active, age, centerY: 230 - age * 330, strength: active ? smoothstep(age / 0.2) * smoothstep((1 - age) / 0.2) : 0 };
}

function displacement(y, time) {
  if (y >= motion.sourceBoundaryY) return { dx: 0, dy: 0 };
  const rootEnvelope = smoothstep((motion.sourceBoundaryY - y) / 95);
  let dx = 0, dy = 0;
  for (const packet of motion.packets) {
    const state = packetAt(packet, time);
    if (!state.active) continue;
    const localY = (y - state.centerY) / packet.radius;
    const support = Math.exp(-localY * localY * 1.7) * state.strength * rootEnvelope;
    dx += packet.amplitude * support * Math.sin(localY * 2.3 + packet.phase);
    dy -= packet.lift * support;
  }
  return { dx, dy };
}

function logoFrame(source, frame, frameCount) {
  // First frame is only recolored/reframed: original path and transforms survive.
  if (frame === 0) return source;
  const time = frame / frameCount;
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
      const { dx, dy } = displacement(y, time);
      warped.push(String(number(x + dx)), String(number(y + dy)));
    }
    i += 2;
  }
  return source.replace(matched[1], warped.join(' '));
}

function iconFrame(name, palette, frame, frameCount) {
  const color = palette.icons[name];
  const phase = tau * frame / frameCount;
  if (name === 'book') {
    const angle = number(Math.sin(phase) * 3.5);
    const line = number(62 + (1 - Math.cos(phase)) * 7);
    return svg('创建作品 · 钢笔笔尖', `<g fill="${color}">
  <g transform="rotate(${angle} 46 51)"><path fill-rule="evenodd" d="M19 68L29 31L59 12L84 37L65 67L28 78ZM45 43A6 6 0 1 0 57 43A6 6 0 1 0 45 43ZM47 48L50 51L27 73L24 70Z"/><path d="M59 8L65 3L93 31L88 37Z"/></g>
  <path d="M14 85Q37 79 ${line} 81V87Q37 85 14 91Z"/></g>`);
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

function cardArtFrame(name, p, frame, frameCount) {
  const phase = tau * frame / frameCount;
  const open = (1 - Math.cos(phase)) / 2;
  const follow = Math.sin(phase) * 1.5;
  const [light, mid, deep] = p[name];
  if (name === 'book') {
    const penLift = number(-3 * open);
    return artSvg('作品 · 手稿与钢笔', `
  <g transform="translate(${number(-2 * open)} ${number(2 * open)}) rotate(${number(-12 - 2 * open)} 91 103)"><rect x="30" y="31" width="106" height="137" rx="9" fill="${p.paperBack}"/><path d="M44 50H112V55H44ZM44 64H103V68H44ZM44 77H112V81H44Z" fill="${mid}" opacity=".38"/></g>
  <g transform="translate(${number(2 * open)} ${number(-4 * open)}) rotate(${number(6 + open)} 111 99)"><rect x="58" y="27" width="102" height="145" rx="8" fill="${p.paperEdge}"/><rect x="58" y="27" width="102" height="142" rx="8" fill="${p.paper}"/>
    <path d="M73 47H119V53H73Z" fill="${mid}"/><path d="M73 66H144V69H73ZM73 78H138V81H73ZM73 90H143V93H73ZM73 102H126V105H73Z" fill="${light}"/>
    <path d="M74 131Q83 117 89 130T104 128Q111 119 118 128" fill="none" stroke="${mid}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${number(22 + open * 35)} 80"/>
    <path d="M136 149L160 127V160Q160 169 151 169H136Z" fill="${light}" opacity=".5"/></g>
  <g transform="translate(${number(follow)} ${penLift}) rotate(32 143 102)"><rect x="135" y="43" width="16" height="77" rx="5" fill="${deep}"/><path d="M138 48H142V110H138Z" fill="${light}"/><path d="M135 115H151L148 138L143 150L138 138Z" fill="${mid}"/><path d="M142 123H144V143H142Z" fill="${p.paper}"/><circle cx="143" cy="123" r="3" fill="${p.paper}"/><path d="M133 111H153V117H133Z" fill="${light}"/></g>`);
  }
  if (name === 'character') {
    return artSvg('角色 · 人物设定卡', `
  <g transform="translate(${number(-3 * open)} ${number(open)}) rotate(${number(-13 - open * 2)} 80 99)"><rect x="24" y="35" width="98" height="129" rx="10" fill="${mid}"/><circle cx="40" cy="50" r="3" fill="${light}"/><circle cx="51" cy="50" r="3" fill="${light}"/><path d="M38 134H98V139H38ZM38 146H82V150H38Z" fill="${light}"/></g>
  <g transform="translate(${number(2 * open)} ${number(-4 * open)}) rotate(${number(5 + open)} 110 96)"><rect x="56" y="24" width="107" height="147" rx="9" fill="${p.paperEdge}"/><rect x="56" y="24" width="107" height="143" rx="9" fill="${p.paper}"/>
    <rect x="68" y="36" width="83" height="87" rx="6" fill="${light}"/><path d="M78 118Q77 96 99 92H120Q141 96 141 118Z" fill="${deep}"/><path d="M102 82H118V103L110 111L102 103Z" fill="${p.paper}"/>
    <g transform="rotate(${number(follow * 2)} 110 91)"><path d="M88 70Q84 44 109 44Q137 43 134 71L129 90H94Z" fill="${deep}"/><path d="M96 63Q109 66 118 53Q120 64 127 66V76Q124 91 110 92Q98 90 95 77Z" fill="${p.paper}"/></g>
    <path d="M71 135H135V140H71ZM71 147H116V151H71Z" fill="${mid}" opacity=".65"/></g>
  <g transform="translate(${number(3 * open)} ${number(-2 * open)}) rotate(-6 141 149)"><rect x="116" y="137" width="57" height="27" rx="7" fill="${deep}"/><path d="M127 148H160V152H127Z" fill="${light}"/><circle cx="166" cy="132" r="8" fill="${mid}"/><path d="M166 127L168 130L171 132L168 134L166 137L164 134L161 132L164 130Z" fill="${p.paper}"/></g>`);
  }
  if (name === 'world') {
    const dotX = number(106 + 51 * Math.cos(phase - 0.7));
    const dotY = number(78 + 27 * Math.sin(phase - 0.7));
    return artSvg('世界观 · 地图与星球', `
  <g transform="translate(${number(-2 * open)} ${number(open)}) rotate(${number(-12 - open)} 91 117)"><path d="M21 66L64 55L112 69L158 57V151L111 165L65 151L21 163Z" fill="${p.paperBack}"/><path d="M21 66L64 55V151L21 163Z" fill="${p.paper}"/><path d="M64 55L112 69V165L64 151Z" fill="${light}"/><path d="M112 69L158 57V151L112 165Z" fill="${p.paper}"/>
    <path d="M29 93L54 79L76 95L103 88L134 111L148 103M30 140L59 114L80 131L104 113L144 133" fill="none" stroke="${mid}" stroke-width="3" opacity=".55"/><path d="M64 59V148M112 74V160" fill="none" stroke="${p.paperEdge}" stroke-width="2"/></g>
  <g transform="translate(${number(2 * open)} ${number(-4 * open)})"><circle cx="106" cy="78" r="44" fill="${mid}"/><path d="M79 44L99 36L120 39L118 51L130 61L124 76L110 80L102 71L88 76L79 65ZM111 91L126 84L141 96L137 109L123 119L112 113L107 100Z" fill="${light}"/>
    <path d="M72 98Q88 125 119 117Q150 109 150 78Q155 109 130 122Q91 139 72 98Z" fill="${deep}"/>
    <ellipse cx="106" cy="79" rx="54" ry="29" transform="rotate(-23 106 79)" fill="none" stroke="${deep}" stroke-width="3"/>
    <circle cx="${dotX}" cy="${dotY}" r="6" fill="${p.paper}"/></g>
  <g transform="translate(${number(open)} ${number(-open)}) rotate(7 140 145)"><rect x="119" y="129" width="48" height="34" rx="5" fill="${deep}"/><path d="M143 136L148 145L143 154L138 145Z" fill="${light}"/><path d="M143 136V154" stroke="${p.paper}" stroke-width="2"/></g>`);
  }
  if (name === 'scene') {
    return artSvg('场景 · 山峦取景卡', `
  <defs><clipPath id="scene-window"><rect x="47" y="47" width="108" height="88" rx="3"/></clipPath></defs>
  <g transform="translate(${number(-2 * open)} ${number(open)}) rotate(${number(-13 - open * 2)} 79 99)"><rect x="22" y="34" width="118" height="132" rx="7" fill="${mid}"/><rect x="33" y="45" width="95" height="72" rx="4" fill="${light}"/><path d="M33 100L61 69L83 94L102 80L128 111V117H33Z" fill="${deep}"/></g>
  <g transform="translate(${number(2 * open)} ${number(-4 * open)}) rotate(${number(7 + open)} 102 98)"><rect x="36" y="35" width="130" height="134" rx="8" fill="${p.paperEdge}"/><rect x="36" y="35" width="130" height="130" rx="8" fill="${p.paper}"/>
    <g clip-path="url(#scene-window)"><rect x="47" y="47" width="108" height="88" fill="${light}"/><circle cx="128" cy="${number(69 - open * 8)}" r="12" fill="${p.paper}"/><path d="M42 121L77 73L110 117L131 90L164 127V143H42Z" fill="${mid}"/><path d="M${number(39 + follow)} 138L78 105L103 123L124 109L163 137Z" fill="${deep}"/><path d="M70 84L77 73L88 87L80 83L76 89Z" fill="${p.paper}"/></g>
    <path d="M49 146H113V151H49Z" fill="${mid}"/><circle cx="148" cy="149" r="4" fill="${light}"/></g>
  <g transform="translate(${number(3 * open)} ${number(-open)}) rotate(-8 145 146)"><path d="M126 130H169V164H126Z" fill="${deep}"/><path d="M133 138V133H138M157 133H162V138M133 155V160H138M157 160H162V155" fill="none" stroke="${p.paper}" stroke-width="2"/></g>`);
  }
  throw new Error(`Unknown card art: ${name}`);
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
      const { dx, dy } = displacement(coordinates[i], frame / frameCount);
      maxAbsoluteDx = Math.max(maxAbsoluteDx, Math.abs(dx));
      maxAbsoluteDy = Math.max(maxAbsoluteDy, Math.abs(dy));
      minDy = Math.min(minDy, dy); maxDy = Math.max(maxDy, dy);
    }
  }
  return { maxAbsoluteDx: number(maxAbsoluteDx), maxAbsoluteDy: number(maxAbsoluteDy), minDy: number(minDy), maxDy: number(maxDy), rasterPixelsPerSourceUnit: 0.2354049 * 192 / 156 };
}

await mkdir(assetsDirectory, { recursive: true });
const packetTrajectories = motion.packets.map((packet) => {
  const samples = Array.from({ length: 65 }, (_, frame) => {
    const time = frame / 64;
    const state = packetAt(packet, time);
    return { frame, time, seconds: time * 4, active: state.active, centerY: number(state.centerY), strength: number(state.strength) };
  });
  const active = samples.filter((sample) => sample.active);
  assert.ok(active.every((sample, index) => index === 0 || sample.centerY < active[index - 1].centerY), 'A smoke packet must move upward while active.');
  assert.equal(samples[0].strength, 0); assert.equal(samples.at(-1).strength, 0);
  return { ...packet, samples };
});
const manifest = {
  version: 3,
  generator: 'design/chat-empty-state/build-assets.mjs',
  generationMethod: 'Local SVG authoring and sharp rasterization; no network, external image generation, credentials, or application data.',
  iconRasterization: 'Preserve SVG alpha coverage, then set RGB of every nontransparent icon pixel to its single declared ink color; this removes overlap-rounding artifacts. Logo is rasterized directly without this step.',
  fpsByType: { logo: 16, icon: 20, 'card-art': 20 },
  spriteLayout: 'horizontal; frame n begins at x = n × frameWidth',
  alpha: true,
  logoNormalization: { originalViewBox: '0 0 128 128', viewBox: logoViewBox, width: 128, height: 128, transforms: 'preserved', originalTransforms: ['translate(0 0) scale(1) translate(0 0)', 'translate(7.03202 1.50000) scale(0.2354049)', 'translate(313,8)'], colors: { paper: palettes.paper.logo, ink: palettes.ink.logo }, allowedChanges: ['Replace root viewBox', 'Replace original single fill color'] },
  logoMotion: { coordinateBoundaryY: motion.sourceBoundaryY, fixedRasterRegion, displaySize: 88, method: 'Three finite wave packets travel strictly upward across original smoke control points, with different birth times, widths, curls, and lifetimes. The root envelope reaches zero at source y=235; body coordinates and transforms remain unchanged. Packets leave and decay, never play backward. This is stylized brand motion, not a fluid simulation.', packetTrajectories, packetTimeUnits: 'time is fraction of 4-second cycle; source centerY decreases upward', trails: false },
  palettes,
  assets: [],
  checks: [],
};
const generated = new Map();

for (const [theme, palette] of Object.entries(palettes)) {
  for (const name of ['logo', 'book', 'character', 'world', 'scene', 'card-book', 'card-character', 'card-world', 'card-scene']) {
    const role = name === 'logo' ? 'logo' : name.startsWith('card-') ? 'card-art' : 'icon';
    const subject = name.replace('card-', '');
    const size = role === 'icon' ? 96 : 192;
    const frameCount = name === 'logo' ? 64 : 24;
    const fps = name === 'logo' ? 16 : 20;
    const stem = `${name}-${theme}`;
    const relativeSource = name === 'logo' ? `public/brand/logo-icon-${theme}.svg` : 'design/chat-empty-state/build-assets.mjs';
    const source = name === 'logo' ? await readFile(path.join(repository, relativeSource), 'utf8') : null;
    const sourceHash = name === 'logo' ? hash(source) : null;
    const normalizedSource = source === null ? null : normalizeLogo(source, palette.logo);
    const frameSvg = (frame) => role === 'logo' ? logoFrame(normalizedSource, frame, frameCount) : role === 'card-art' ? cardArtFrame(subject, palette, frame, frameCount) : iconFrame(name, palette, frame, frameCount);
    const firstSvg = frameSvg(0);
    if (source !== null) {
      assert.equal(firstSvg, normalizedSource, `${stem}: frame zero must equal the normalized brand SVG.`);
      assert.equal(firstSvg.match(/<path\s+d="([^"]+)"/)[1], source.match(/<path\s+d="([^"]+)"/)[1], `${stem}: frame-zero brand path must be unchanged.`);
      assert.deepEqual(firstSvg.match(/transform="[^"]+"/g), source.match(/transform="[^"]+"/g), `${stem}: all brand transforms must survive normalization.`);
    }
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) frames.push(await raster(frameSvg(frame), size, role === 'icon' ? palette.icons[name] : null));

    const changedPixelsByFrame = frames.map((frame) => compareRegions(frames[0], frame, size));
    assert.ok(changedPixelsByFrame.slice(1).some((count) => count > 0), `${stem}: a hover animation must change pixels.`);
    const checks = { sprite: `${stem}.png`, frameZeroMatchesDeclaredRasterization: true, ...(name === 'logo' ? { frameZeroMatchesStaticSvg: true } : {}), animationChangesPixels: true, changedPixelsVsFrameZero: changedPixelsByFrame };
    const allPixelStats = frames.map((frame) => pixelStats(frame, size));
    const expectedColor = role === 'logo' ? palette.logo : role === 'icon' ? palette.icons[name] : null;
    assert.ok(allPixelStats.every((stats) => stats.edgePixels === 0), `${stem}: all image edges must remain transparent.`);
    if (expectedColor) assert.ok(allPixelStats.every((stats) => stats.opaqueColors.length === 1 && stats.opaqueColors[0] === expectedColor), `${stem}: only the chosen solid color is allowed.`);
    Object.assign(checks, { transparentEdgesAllFrames: true, ...(expectedColor ? { opaqueColorAllFrames: expectedColor } : {}), frameZeroBounds: allPixelStats[0].bbox, allFrameBounds: unionBounds(allPixelStats) });
    if (name === 'logo') {
      const fixedRegionChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, fixedRasterRegion.y));
      const smokeChangedPixels = frames.map((frame) => compareRegions(frames[0], frame, size, 0, fixedRasterRegion.y));
      assert.ok(fixedRegionChangedPixels.every((count) => count === 0), `${stem}: the incense burner must be pixel-identical throughout the animation.`);
      assert.ok(smokeChangedPixels.filter((count) => count > 0).length > frameCount * 0.8, `${stem}: smoke must visibly change through most of its cycle.`);
      const loopBoundaryChangedPixels = compareRegions(frames.at(-1), frames[0], size);
      assert.equal(loopBoundaryChangedPixels, 0, `${stem}: final frame must settle to the normalized original before the cycle closes.`);
      const smokeStats = frames.map((frame) => pixelStats(frame, size, fixedRasterRegion.y));
      Object.assign(checks, { originalSvgSha256: sourceHash, normalizedSvgSha256: hash(normalizedSource), staticSvgMatchesNormalizedOriginal: true, originalPathAndTransformsPreserved: true, fixedRasterRegion, fixedRegionChangedPixels, smokeChangedPixels, burnerFixedAllFrames: true, smokeChangesDuringCycle: true, loopBoundaryChangedPixels, adjacentSmokeChanges: frames.map((frame, index) => compareRegions(frame, frames[(index + 1) % frameCount], size, 0, fixedRasterRegion.y)), smokeCoverage: { firstFrame: smokeStats[0], unionBounds: unionBounds(smokeStats), frames: smokeStats.map(({ bbox, occupiedPixels }) => ({ bbox, occupiedPixels })), maximumChangedPixelsVsFrameZero: Math.max(...smokeChangedPixels), maximumChangedPixelsAsFractionOfFirstFrameSmoke: Math.max(...smokeChangedPixels) / smokeStats[0].occupiedPixels }, sourceDisplacement: smokeDisplacementStats(source, frameCount) });
    } else if (role === 'icon') {
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
    manifest.assets.push({ name, role, theme, sprite: `${stem}.png`, staticSvg: `${stem}.svg`, firstFrame: `${stem}-first.png`, frameWidth: size, frameHeight: size, frameCount, fps, durationMs: frameCount / fps * 1000, width: size * frameCount, height: size, source: relativeSource, ...(sourceHash ? { sourceSha256: sourceHash } : {}), spriteSha256: hash(sprite), bytes: sprite.length, colors: name === 'logo' ? [palette.logo] : [...new Set(firstSvg.match(/#[\da-f]{6}/gi))] });
    generated.set(stem, { frames, size, frameCount });
    console.log(`${stem}: ${frameCount} frames × ${size}px; ${sprite.length} bytes; pixel checks passed`);
  }
}

// Contact sheet uses actual intended display sizes and four discrete frame samples.
const sheetWidth = 1280;
const sheetHeight = 1210;
const placements = [];
let labels = '';
for (const [column, theme] of ['paper', 'ink'].entries()) {
  const palette = palettes[theme];
  const originX = column * 640;
  labels += `<rect x="${originX}" width="640" height="${sheetHeight}" fill="${palette.background}"/><text x="${originX + 28}" y="40" fill="${palette.text}" font-size="19" font-weight="600">${theme === 'paper' ? 'PAPER' : 'INK'} / v3 inspiration unfolds</text>`;
  for (let sample = 0; sample < 4; sample++) labels += `<text x="${originX + 90 + sample * 150}" y="73" fill="${palette.secondary}" font-size="12" text-anchor="middle">${sample * 25}%</text>`;
  for (const [row, name] of ['logo', 'card-book', 'card-character', 'card-world', 'card-scene'].entries()) {
    const { frames, size, frameCount } = generated.get(`${name}-${theme}`);
    const displaySize = name === 'logo' ? 88 : 144;
    const rowTop = row === 0 ? 92 : 316 + (row - 1) * 213;
    labels += `<text x="${originX + 28}" y="${rowTop + (row === 0 ? 106 : 185)}" fill="${palette.secondary}" font-size="12">${name} / ${displaySize}px</text>`;
    for (let sample = 0; sample < 4; sample++) {
      const frame = Math.floor(frameCount * sample / 4);
      const input = await sharp(frames[frame], { raw: { width: size, height: size, channels: 4 } }).resize(displaySize, displaySize).png().toBuffer();
      placements.push({ input, left: originX + 90 + sample * 150 - displaySize / 2, top: rowTop });
    }
  }
  for (const [index, name] of ['book', 'character', 'world', 'scene'].entries()) {
    const { frames, size } = generated.get(`${name}-${theme}`);
    const input = await sharp(frames[0], { raw: { width: size, height: size, channels: 4 } }).resize(28, 28).png().toBuffer();
    placements.push({ input, left: originX + 76 + index * 150, top: 242 });
    labels += `<text x="${originX + 90 + index * 150}" y="292" fill="${palette.secondary}" font-size="12" text-anchor="middle">${name} / 28px</text>`;
  }
}
const contactSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}"><g font-family="Arial, sans-serif">${labels}</g></svg>`;
await sharp(Buffer.from(contactSvg)).composite(placements).png().toFile(path.join(assetsDirectory, 'contact-sheet.png'));
manifest.contactSheet = 'contact-sheet.png';
manifest.verification = { executed: true, command: 'node design/chat-empty-state/build-assets.mjs', allChecksPassed: manifest.checks.every((check) => check.passed), scope: 'Generated design assets only; not business, Electron, or target-system acceptance.' };
await writeFile(path.join(assetsDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.assets.length} sprite sets, static sources, first frames, contact sheet, and manifest.`);
