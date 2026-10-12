'use strict';
// Review-only interaction. No product IPC, requests, storage, or model calls.
const panel = document.querySelector('#panel');
const dialog = document.querySelector('#interaction-dialog');
const wizardDialog = document.querySelector('#wizard-dialog');
const reduced = document.querySelector('#reduce-motion');
const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
const sprites = [...document.querySelectorAll('[data-sprite]')].map(el => ({
  el, target: el.closest('button') || el.closest('.brand-motion'),
  frames: Number(el.dataset.frames), hover: false, start: null,
  frameMs: 1000 / Number(el.dataset.fps || 20),
  loop: el.dataset.role !== 'card-art',
  position: 0, previousTime: null, direction: 0,
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
function motionAllowed() {
  return !systemReduced.matches && !reduced.checked && !document.hidden && pageFocused && !dialog.open && !wizardDialog.open;
}
function triggered(sprite) {
  const focused = document.activeElement === sprite.target && sprite.target.matches(':focus-visible');
  return sprite.hover || focused;
}
function animateCardArt(sprite, now, allowed) {
  if (!allowed) {
    sprite.position = 0;
    sprite.previousTime = null;
    sprite.direction = 0;
    paint(sprite, 0);
    return false;
  }
  // The existing artwork is most expanded halfway through its source cycle.
  const peak = Math.floor(sprite.frames / 2);
  const time = Math.max(now, sprite.previousTime ?? now);
  if (sprite.previousTime !== null) {
    // Integrate the previous direction before changing targets, so a quick
    // pointer reversal continues from the current pose rather than jumping.
    sprite.position = Math.min(peak, Math.max(0, sprite.position + (time - sprite.previousTime) / sprite.frameMs * sprite.direction));
  }
  sprite.previousTime = time;
  const target = triggered(sprite) ? peak : 0;
  sprite.direction = target === peak ? 1 : -1;
  paint(sprite, Math.round(sprite.position));
  return sprite.position !== target;
}
function animate(now) {
  animationRequest = null;
  let active = false;
  const allowed = motionAllowed();
  for (const sprite of sprites) {
    if (!sprite.loop) {
      const moving = animateCardArt(sprite, now, allowed);
      active = active || moving;
      continue;
    }
    if (allowed && triggered(sprite)) {
      if (sprite.start === null) sprite.start = now;
      // An rAF timestamp can precede performance.now() from the same tick.
      // Clamp the first delta so no negative sprite frame can flash briefly.
      const elapsedFrame = Math.floor(Math.max(0, now - sprite.start) / sprite.frameMs);
      paint(sprite, elapsedFrame % sprite.frames);
      active = true;
    } else {
      sprite.start = null;
      paint(sprite, 0);
    }
  }
  if (active) animationRequest = requestAnimationFrame(animate);
}
function updateAnimations() {
  panel.dataset.motion = motionAllowed() ? 'ready' : 'paused';
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
    document.querySelectorAll('[data-icon]').forEach(icon => { icon.src = `assets/${icon.dataset.icon}-${button.dataset.theme}-first.png`; });
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
  model: { title: '选择文本模型', text: '当前预览没有可用文本模型。正式应用在这里打开原有模型选择器，可从已配置的模型中选择；没有模型时前往设置添加。', extra: '设计稿不连接模型服务，请勿在这里输入 API Key。', primary: '知道了' },
  mode: { title: '标准与计划模式', text: '正式应用保留原有标准 / 计划模式选择、模型思考强度与发送状态。本稿展示默认标准模式，配置内容以真实模型能力为准。', primary: '知道了' },
  association: { title: '选择关联作品', text: '正式应用显示真实作品列表，支持搜索、选择作品及不关联作品（仅对话）。本稿没有载入任何作品数据。', extra: '创建中的作品会显示待创建状态，不能提前添加角色、场景或世界观。', primary: '创建作品', next: 'book' },
  add: { title: '引用创作内容', text: '正式应用保留原输入框的 @ 引用与内容 chip。图片、附件和会话引用继续保留现有「即将支持」状态。', extra: '本稿只验证布局与交互入口，不实现上传或引用解析。', primary: '知道了' },
  notes: { title: '灵感展开', text: '四张等大的创作卡，各有静态彩色图标和灰度半透明插画。创建作品与题材卡打开创作向导；角色、世界观、场景填入可编辑提示词。悬停时右图展开到中间帧，移开后倒放收回。', extra: '向导使用本应用现有分类与预置模板，题材卡带入可修改的推荐定位。确定后仅填入输入框，由你修改后再发送。当前为HTML审核稿，所有素材和数据在本地加载。', primary: '继续查看' },
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
const quickPrompts = {
  character: '【角色】\n请帮我创建一个适合当前故事的新角色，并与已有设定保持一致。\n・姓名与身份：\n・外貌与鲜明特征：\n・性格、目标与弱点：\n・人物背景与关键关系：\n・成长弧线与剧情作用：',
  world: '【世界观】\n请帮我搭建当前故事的世界观，并与已有设定保持一致。\n・时代背景与地理格局：\n・核心规则、能力体系与限制：\n・社会制度、文化与主要势力：\n・历史事件与当下矛盾：\n・可以推动故事的冲突与秘密：',
  scene: '【场景】\n请帮我设计一个适合当前故事的新场景，并与已有设定保持一致。\n・场景名称、地点与时间：\n・空间布局与环境特征：\n・氛围、光线、声音与气味：\n・出场人物与关键物件：\n・场景的剧情作用与潜在冲突：',
};
function insertQuickPrompt(name) {
  const prompt = quickPrompts[name];
  if (!draft.value.includes(prompt)) draft.value = draft.value.trim() ? `${draft.value}\n\n${prompt}` : prompt;
  draft.dispatchEvent(new Event('input', { bubbles: true }));
  draft.focus({ preventScroll: true });
  draft.setSelectionRange(draft.value.length, draft.value.length);
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.action;
  if (action === 'book' || action.startsWith('genre-')) creationWizard.open(action, button);
  else if (quickPrompts[action]) insertQuickPrompt(action);
  else openFlow(action, button);
}));
document.querySelector('#design-notes').addEventListener('click', event => openFlow('notes', event.currentTarget));
document.querySelector('#close-dialog').addEventListener('click', closeFlow);
document.querySelector('#dialog-secondary').addEventListener('click', closeFlow);
document.querySelector('#dialog-primary').addEventListener('click', () => {
  if (dialogAction === 'book') { closeFlow(); creationWizard.open('book', returnFocus); }
  else if (dialogAction) openFlow(dialogAction);
  else closeFlow();
});
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
draft.addEventListener('input', () => { draft.style.height = 'auto'; draft.style.height = `${Math.min(140, Math.max(48, draft.scrollHeight))}px`; });
creationWizard.setMotionListener(updateAnimations);
updateAnimations();
