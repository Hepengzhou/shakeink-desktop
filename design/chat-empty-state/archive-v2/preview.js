'use strict';
// Review-only interaction. No product IPC, requests, storage, or model calls.
const panel = document.querySelector('#panel');
const dialog = document.querySelector('#interaction-dialog');
const reduced = document.querySelector('#reduce-motion');
const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
const sprites = [...document.querySelectorAll('[data-sprite]')].map(el => ({
  el, target: el.closest('button') || el.closest('.brand-motion'),
  frames: el.dataset.sprite === 'logo' ? 64 : 24, hover: false, start: null,
  frameMs: 1000 / Number(el.dataset.fps || 20),
}));
let pageFocused = true;
let animationRequest = null;
let returnFocus = null;
let dialogAction = null;

function paint(sprite, frame) {
  sprite.el.dataset.frame = String(frame);
  const size = parseFloat(getComputedStyle(sprite.el).width);
  sprite.el.style.backgroundPosition = `${-frame * size}px 0px`;
}
function mayAnimate(sprite) {
  const focused = document.activeElement === sprite.target && sprite.target.matches(':focus-visible');
  return !systemReduced.matches && !reduced.checked && !document.hidden && pageFocused && !dialog.open && (sprite.hover || focused);
}
function animate(now) {
  animationRequest = null;
  let active = false;
  for (const sprite of sprites) {
    if (mayAnimate(sprite)) {
      if (sprite.start === null) sprite.start = now;
      // An rAF timestamp can precede performance.now() from the same tick.
      // Clamp the first delta so no negative sprite frame can flash briefly.
      paint(sprite, Math.floor(Math.max(0, now - sprite.start) / sprite.frameMs) % sprite.frames);
      active = true;
    } else {
      sprite.start = null;
      paint(sprite, 0);
    }
  }
  if (active) animationRequest = requestAnimationFrame(animate);
}
function updateAnimations() {
  if (animationRequest !== null) cancelAnimationFrame(animationRequest);
  animationRequest = null;
  animate(performance.now());
}
// Read the browser's current focus-visible state, including modality changes
// on an element that was already focused (which do not emit another focus event).
document.addEventListener('keydown', () => requestAnimationFrame(updateAnimations), true);
document.addEventListener('pointerdown', () => requestAnimationFrame(updateAnimations), true);
for (const sprite of sprites) {
  sprite.target.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') sprite.hover = true; updateAnimations(); });
  sprite.target.addEventListener('pointerleave', () => { sprite.hover = false; updateAnimations(); });
  sprite.target.addEventListener('focus', updateAnimations);
  sprite.target.addEventListener('blur', updateAnimations);
}
window.addEventListener('blur', () => { pageFocused = false; updateAnimations(); });
window.addEventListener('focus', () => { pageFocused = true; updateAnimations(); });
document.addEventListener('visibilitychange', updateAnimations);
systemReduced.addEventListener('change', updateAnimations);
reduced.addEventListener('change', updateAnimations);
new ResizeObserver(() => {
  document.querySelector('#dimensions').textContent = `${Math.round(panel.getBoundingClientRect().width)} × ${Math.round(panel.getBoundingClientRect().height)}`;
  for (const sprite of sprites) paint(sprite, Number(sprite.el.dataset.frame));
}).observe(panel);

document.querySelectorAll('[data-theme]').forEach(button => {
  if (button.tagName !== 'BUTTON') return;
  button.addEventListener('click', () => {
    panel.dataset.theme = button.dataset.theme;
    document.querySelectorAll('button[data-theme]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    updateAnimations();
  });
});
document.querySelectorAll('[data-width]').forEach(button => button.addEventListener('click', () => {
  panel.style.setProperty('--panel-width', `${button.dataset.width}px`);
  document.querySelectorAll('[data-width]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));
document.querySelector('#short-window').addEventListener('change', event => panel.classList.toggle('is-short', event.target.checked));

const flows = {
  book: { title: '从创作向导开始', text: '正式应用中，这里打开现有创作向导。选好作品方向与起手模板后，内容会放入输入框，由你修改后再发送；已有草稿时先确认替换。', extra: '当前为设计审核稿，不创建作品，也不自动发送消息。', primary: '返回设计稿' },
  world: { title: '先选择一部作品', text: '新世界观需要归属一部已创建的作品。关联作品后，打开世界观命名窗口，创建根世界观并进入详情。', extra: '没有作品时，可先从「创建作品」开始。待创建的作品尚不能添加世界观。', primary: '创建作品', next: 'book' },
  character: { title: '先选择一部作品', text: '新角色需要归属一部已创建的作品。关联作品后，沿用现有流程创建「新角色」，再进入详情编辑姓名与设定。', extra: '没有作品时，可先从「创建作品」开始。待创建的作品尚不能添加角色。', primary: '创建作品', next: 'book' },
  scene: { title: '先选择一部作品', text: '新场景需要归属一部已创建的作品。关联作品后，打开场景命名窗口，创建根场景并进入详情。', extra: '没有作品时，可先从「创建作品」开始。待创建的作品尚不能添加场景。', primary: '创建作品', next: 'book' },
  model: { title: '选择文本模型', text: '当前预览没有可用文本模型。正式应用在这里打开原有模型选择器，可从已配置的模型中选择；没有模型时前往设置添加。', extra: '设计稿不连接模型服务，请勿在这里输入 API Key。', primary: '知道了' },
  mode: { title: '标准与计划模式', text: '正式应用保留原有标准 / 计划模式选择、模型思考强度与发送状态。本稿展示默认标准模式，配置内容以真实模型能力为准。', primary: '知道了' },
  association: { title: '选择关联作品', text: '正式应用显示真实作品列表，支持搜索、选择作品及不关联作品（仅对话）。本稿没有载入任何作品数据。', extra: '创建中的作品会显示待创建状态，不能提前添加角色、场景或世界观。', primary: '创建作品', next: 'book' },
  add: { title: '引用创作内容', text: '正式应用保留原输入框的 @ 引用与内容 chip。图片、附件和会话引用继续保留现有「即将支持」状态。', extra: '本稿只验证布局与交互入口，不实现上传或引用解析。', primary: '知道了' },
  notes: { title: '灰阶与呼吸', text: '亮灰香炉与舒展烟气构成创作起点。四个入口统一底色，以单色面性符号区分；轻量横排和细描边让内容更从容。输入框始终停靠底部。', extra: '参考 Manus 公开首屏的留白与克制质感，保留玄印品牌与自身布局。Logo 源自现有 SVG，炉身固定；所有帧素材离线加载。', primary: '继续查看' },
};
function openFlow(name, trigger) {
  const flow = flows[name];
  if (!flow) return;
  if (!dialog.open) returnFocus = trigger || document.activeElement;
  dialog.dataset.flow = name;
  document.querySelector('#dialog-title').textContent = flow.title;
  document.querySelector('#dialog-description').textContent = flow.text;
  document.querySelector('#dialog-extra').textContent = flow.extra || '';
  if (name === 'notes') {
    const links = document.createElement('div');
    for (const [text, href] of [['阅读调研文档','research.md'], ['阅读产品设计','product-design.md']]) {
      const a = document.createElement('a'); a.textContent = text; a.href = href; a.target = '_blank'; a.rel = 'noopener'; links.append(a);
    }
    document.querySelector('#dialog-extra').append(links);
  }
  document.querySelector('#dialog-primary').textContent = flow.primary;
  dialogAction = flow.next || null;
  if (!dialog.open) dialog.showModal();
  updateAnimations();
  document.querySelector('#close-dialog').focus();
}
function closeFlow() { dialog.close(); }
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => openFlow(button.dataset.action, button)));
document.querySelector('#design-notes').addEventListener('click', event => openFlow('notes', event.currentTarget));
document.querySelector('#close-dialog').addEventListener('click', closeFlow);
document.querySelector('#dialog-secondary').addEventListener('click', closeFlow);
document.querySelector('#dialog-primary').addEventListener('click', () => dialogAction ? openFlow(dialogAction) : closeFlow());
dialog.addEventListener('close', () => { returnFocus?.focus({ preventScroll: true }); updateAnimations(); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first?.focus();
  }
});
const draft = document.querySelector('#draft');
draft.addEventListener('input', () => { draft.style.height = 'auto'; draft.style.height = `${Math.min(140, Math.max(panel.classList.contains('is-short') ? 48 : 64, draft.scrollHeight))}px`; });
updateAnimations();
