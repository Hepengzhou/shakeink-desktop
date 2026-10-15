'use strict';
// Local design interaction using the app's public, fixed template corpus.
const creationWizard = (() => {
  const data = window.SHAKEINK_WIZARD_DATA;
  const modal = document.querySelector('#wizard-dialog');
  const draftInput = document.querySelector('#draft');
  const filterRoot = document.querySelector('#wizard-filters');
  const grid = document.querySelector('#wizard-templates');
  const detail = document.querySelector('#wizard-detail');
  const labels = { theme: '主题', world: '世界观', character: '角色', plot: '剧情' };
  const groupLabels = { sub: '子类', bg: '背景', style: '风格', flow: '情节' };
  const presets = {
    'genre-xianxia': { genre: '仙侠', tags: { sub: ['古典仙侠'], bg: ['修仙界'], style: ['热血'], flow: ['升级流'] } },
    'genre-history': { genre: '历史', tags: { sub: ['架空历史'], bg: ['古代'], style: ['正剧'], flow: ['权谋'] } },
    'genre-scifi': { genre: '科幻', tags: { sub: ['星际文明'], bg: ['星际'], style: ['烧脑'], flow: ['经营'] } },
  };
  const byId = new Map(data.templates.map(template => [template.id, template]));
  const groups = ['sub', 'bg', 'style', 'flow'];
  let filters, picks, category, returnTarget, detailId, detailTarget;
  let focusDraftOnClose = false;
  let onMotionChange = () => {};

  const genres = () => data.taxonomy.genresByChannel[filters.channel] || data.taxonomy.genreUnion;
  const styles = () => data.taxonomy.stylesByChannel[filters.channel] || data.taxonomy.stylesByChannel.default;
  const groupOptions = group => ({ sub: data.taxonomy.subgenres[filters.genre] || [], bg: data.taxonomy.backgrounds, style: styles(), flow: data.taxonomy.flows })[group];
  function visible(template) {
    if (filters.channel !== '不限' && template.channels.length && !template.channels.includes(filters.channel)) return false;
    if (filters.length !== '不限' && template.lengths?.length && !template.lengths.includes(filters.length)) return false;
    if (filters.genre !== '全部' && template.genres.length && !template.genres.includes(filters.genre)) return false;
    return groups.every(group => {
      const own = template.tags.filter(tag => data.taxonomy.tagGroupVocabs[group].includes(tag));
      return !filters.tags[group].length || !own.length || own.some(tag => filters.tags[group].includes(tag));
    });
  }
  function filtered(cat) {
    const score = template => template.tags.filter(tag => groups.some(group => data.taxonomy.tagGroupVocabs[group].includes(tag) && filters.tags[group].includes(tag))).length;
    return data.templates.filter(template => template.cat === cat && visible(template)).sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  function resetConfirmation() {
    document.querySelector('#wizard-replace-row').hidden = true;
    document.querySelector('#wizard-footer-actions').hidden = false;
  }
  function clearError() {
    const error = document.querySelector('#wizard-error');
    error.hidden = true;
    error.textContent = '';
  }
  function chip(label, kind, value, selected) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wizard-chip';
    button.dataset[kind === 'filter' ? 'wizardFilter' : 'wizardTag'] = value;
    button.dataset.value = label;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(selected));
    return button;
  }
  function row(label, options, kind, field) {
    if (!options.length) return;
    const element = document.createElement('div');
    element.className = 'wizard-filter-row';
    const heading = document.createElement('span');
    heading.textContent = label;
    const content = document.createElement('div');
    for (const option of options) content.append(chip(option, kind, field, kind === 'filter' ? filters[field] === option : filters.tags[field].includes(option)));
    element.append(heading, content);
    filterRoot.append(element);
  }
  function renderFilters() {
    const active = document.activeElement;
    const key = active?.dataset.wizardFilter ? ['wizardFilter', active.dataset.wizardFilter, active.dataset.value] : active?.dataset.wizardTag ? ['wizardTag', active.dataset.wizardTag, active.dataset.value] : null;
    filterRoot.replaceChildren();
    row('频道', ['不限', ...data.taxonomy.channels], 'filter', 'channel');
    row('篇幅', ['不限', ...data.taxonomy.lengths], 'filter', 'length');
    row('题材', ['全部', ...genres()], 'filter', 'genre');
    for (const group of groups) row(groupLabels[group], groupOptions(group), 'tag', group);
    if (key) [...filterRoot.querySelectorAll('button')].find(button => button.dataset[key[0]] === key[1] && button.dataset.value === key[2])?.focus({ preventScroll: true });
  }
  function renderSelection() {
    grid.querySelectorAll('[data-template-id]').forEach(button => button.setAttribute('aria-pressed', String(picks[category] === button.dataset.templateId)));
    const summary = document.querySelector('#wizard-summary');
    summary.textContent = `已选：${data.categories.map(cat => `${labels[cat]} ${picks[cat] === 'blank' ? '空白' : `《${byId.get(picks[cat]).title}》`}`).join(' · ')}`;
    summary.title = summary.textContent;
    document.querySelectorAll('[data-wizard-category]').forEach(button => {
      button.setAttribute('aria-current', String(button.dataset.wizardCategory === category));
      button.querySelector('small').textContent = String(filtered(button.dataset.wizardCategory).length);
      button.dataset.picked = String(picks[button.dataset.wizardCategory] !== 'blank');
    });
  }
  function renderTemplates() {
    grid.replaceChildren();
    const templates = [null, ...filtered(category)];
    for (const template of templates) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wizard-template';
      button.dataset.templateId = template?.id || 'blank';
      const mark = document.createElement('span');
      mark.className = 'wizard-template-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = template ? labels[category].slice(0, 1) : '+';
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = template?.title || '空白模板';
      const description = document.createElement('small');
      description.textContent = template?.summary || '从空白开始，此环节不使用预制内容。';
      copy.append(title, description);
      button.append(mark, copy);
      grid.append(button);
    }
    if (templates.length === 1) {
      const empty = document.createElement('p');
      empty.className = 'wizard-empty';
      empty.textContent = '当前条件下暂无预制模板，可从空白开始或放宽条件。';
      grid.append(empty);
    }
    renderSelection();
    grid.scrollTop = 0;
  }
  function updateFilters(field, value) {
    clearError();
    resetConfirmation();
    if (field === 'channel') {
      filters.channel = value;
      if (filters.genre !== '全部' && !genres().includes(filters.genre)) {
        filters.genre = '全部';
        filters.tags.sub = [];
      }
      filters.tags.style = filters.tags.style.filter(tag => styles().includes(tag));
    } else {
      if (field === 'genre' && filters.genre !== value) filters.tags.sub = [];
      filters[field] = value;
    }
    for (const cat of data.categories) if (picks[cat] !== 'blank' && !visible(byId.get(picks[cat]))) picks[cat] = 'blank';
    renderFilters();
    renderTemplates();
  }
  filterRoot.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.wizardFilter) return updateFilters(button.dataset.wizardFilter, button.dataset.value);
    const group = button.dataset.wizardTag;
    const selected = filters.tags[group];
    if (!selected.includes(button.dataset.value) && groups.reduce((count, name) => count + filters.tags[name].length, 0) >= 20) {
      const error = document.querySelector('#wizard-error');
      error.hidden = false;
      error.textContent = '最多选择 20 个标签';
      return;
    }
    filters.tags[group] = selected.includes(button.dataset.value) ? selected.filter(value => value !== button.dataset.value) : [...selected, button.dataset.value];
    clearError(); resetConfirmation();
    for (const cat of data.categories) if (picks[cat] !== 'blank' && !visible(byId.get(picks[cat]))) picks[cat] = 'blank';
    renderFilters(); renderTemplates();
  });
  for (const cat of data.categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.wizardCategory = cat;
    const title = document.createElement('span');
    title.textContent = labels[cat];
    button.append(title, document.createElement('small'));
    button.addEventListener('click', () => { category = cat; renderTemplates(); });
    document.querySelector('#wizard-categories').append(button);
  }
  function pick(id) {
    picks[category] = id;
    resetConfirmation();
    renderSelection();
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-template-id]');
    if (button) pick(picks[category] === button.dataset.templateId ? 'blank' : button.dataset.templateId);
  });
  grid.addEventListener('dblclick', event => {
    const button = event.target.closest('[data-template-id]');
    if (!button) return;
    detailId = button.dataset.templateId;
    detailTarget = button;
    pick(detailId);
    const template = byId.get(detailId);
    document.querySelector('#wizard-detail-title').textContent = template?.title || '空白模板';
    document.querySelector('#wizard-detail-meta').textContent = template ? [...template.channels, ...template.genres, ...(template.lengths || []), ...(template.archetype ? [template.archetype] : []), ...template.tags].join(' · ') : `${labels[category]} · 空白模板`;
    document.querySelector('#wizard-detail-prompt').textContent = template?.prompt || '此环节不预填内容，确定后由你在输入框自由书写，或由AI通过提问帮你理清。';
    detail.hidden = false;
    document.querySelector('#wizard-detail-close').focus();
  });
  function closeDetail() {
    detail.hidden = true;
    detailTarget?.focus({ preventScroll: true });
  }
  document.querySelector('#wizard-detail-close').addEventListener('click', closeDetail);
  document.querySelector('#wizard-detail-use').addEventListener('click', () => { pick(detailId); closeDetail(); });
  detail.addEventListener('click', event => { if (event.target === detail) closeDetail(); });
  function compose() {
    const lengthMeta = filters.length === '不限' ? '' : `（${data.taxonomy.lengthMeta[filters.length]}）`;
    const lines = ['我的作品定位：', `・频道：${filters.channel}`, `・篇幅：${filters.length}${lengthMeta}`, `・题材：${filters.genre}`];
    for (const group of groups) if (filters.tags[group].length) lines.push(`・${group === 'sub' ? '题材子类' : groupLabels[group]}：${filters.tags[group].join('、')}`);
    return ['我想创作一部新小说，请带我一步步完成它。', lines.join('\n'), ...data.categories.filter(cat => picks[cat] !== 'blank').map(cat => byId.get(picks[cat]).prompt)].join('\n\n');
  }
  function confirm(replace = false) {
    if (draftInput.value.trim() && !replace) {
      document.querySelector('#wizard-replace-row').hidden = false;
      document.querySelector('#wizard-footer-actions').hidden = true;
      document.querySelector('#wizard-replace-back').focus();
      return;
    }
    draftInput.value = compose();
    draftInput.dispatchEvent(new Event('input', { bubbles: true }));
    focusDraftOnClose = true;
    modal.close();
  }
  document.querySelector('#wizard-confirm').addEventListener('click', () => confirm());
  document.querySelector('#wizard-replace').addEventListener('click', () => confirm(true));
  document.querySelector('#wizard-replace-back').addEventListener('click', () => { resetConfirmation(); document.querySelector('#wizard-confirm').focus(); });
  for (const id of ['wizard-close', 'wizard-cancel']) document.querySelector(`#${id}`).addEventListener('click', () => modal.close());
  modal.addEventListener('cancel', event => { if (!detail.hidden) { event.preventDefault(); closeDetail(); } });
  modal.addEventListener('close', () => {
    (focusDraftOnClose ? draftInput : returnTarget)?.focus({ preventScroll: true });
    if (focusDraftOnClose) draftInput.setSelectionRange(draftInput.value.length, draftInput.value.length);
    focusDraftOnClose = false;
    onMotionChange();
  });
  modal.addEventListener('keydown', event => {
    // Handle the inner layer before the browser's native close request, which
    // is not always cancellable after repeated modal Escape interactions.
    if (event.key === 'Escape' && !detail.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeDetail();
      return;
    }
    if (event.key !== 'Tab') return;
    const scope = detail.hidden ? modal : detail;
    const controls = [...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  });
  return {
    open(action, trigger) {
      filters = JSON.parse(JSON.stringify(data.defaultFilters));
      picks = Object.fromEntries(data.categories.map(cat => [cat, 'blank']));
      category = 'theme';
      returnTarget = trigger || document.activeElement;
      focusDraftOnClose = false;
      detail.hidden = true;
      const preset = presets[action];
      if (preset) filters = { channel: '男频', length: '长篇', genre: preset.genre, tags: JSON.parse(JSON.stringify(preset.tags)) };
      clearError(); resetConfirmation(); renderFilters(); renderTemplates();
      modal.showModal();
      onMotionChange();
      document.querySelector('#wizard-close').focus();
    },
    setMotionListener(listener) { onMotionChange = listener; },
  };
})();
