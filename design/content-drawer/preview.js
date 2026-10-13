// Offline design demonstration only; never imported into the installed product.
(() => {
  const $ = id => document.getElementById(id);
  const workspace = $('workspace'), right = $('content-inner'), left = $('sidebar-inner');
  const state = { width:1280, mode:'wide', requested:500, full:false, right:{ w:500,v:500,to:500,open:true,moving:false,raf:0 }, left:{ w:260,v:260,to:260,open:true,moving:false,raf:0 } };
  let previousFocus = null;
  const ease = t => t >= 1 ? 1 : 1 - (1 + 6.6*t)*Math.exp(-6.6*t);
  const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max));
  function projection(contentOpen=state.right.open,sidebarOpen=state.left.open) {
    const available=state.width-2,chatMin=contentOpen&&state.full?0:420,contentMin=contentOpen?available*.3:0;
    const sidebarMin=Math.min(200,Math.max(available-chatMin-contentMin,0));
    const sidebar=sidebarOpen?clamp(260,sidebarMin,Math.min(420,available-chatMin-contentMin)):0;
    const content=contentOpen?(state.full?available-sidebar:clamp(state.requested,contentMin,available-sidebar-chatMin)):0;
    return {sidebar,content};
  }
  const settledRight = (open=state.right.open) => state.mode === 'narrow' ? state.width-2 : projection(open).content;
  function render() {
    workspace.style.width = `${state.width}px`; workspace.dataset.mode = state.mode;
    const r=state.right,l=state.left;
    $('content-viewport').style.width = `${Math.max(0,r.v)}px`;
    right.style.width = `${r.w}px`; right.style.transform = `translateX(${Math.max(r.w-r.v,0)}px)`;
    $('sidebar-viewport').style.width = `${Math.max(0,l.v)}px`;
    left.style.width = `${l.w}px`; left.style.transform = `translateX(${Math.min(l.v-l.w,0)}px)`;
    right.inert = r.moving || r.v !== r.w || !r.open;
    left.inert = l.moving || l.v !== l.w || !l.open;
    right.setAttribute('aria-hidden',String(right.inert)); left.setAttribute('aria-hidden',String(left.inert));
    $('sidebar-restore').hidden = l.open && !l.moving;
    $('content-restore').hidden = r.open && !r.moving;
    $('chat').inert = state.mode === 'narrow' && (l.v>0 || r.v>0);
    $('chat').style.visibility = state.mode === 'wide' && state.full && !r.moving ? 'hidden' : 'visible';
    $('width-readout').textContent = `完整宽度 ${Math.round(r.w)}px · 可见 ${Math.round(r.v)}px`;
    $('progress').value = String(Math.round(r.v/r.w*100)); $('progress-value').textContent = `${Math.round(r.v/r.w*100)}%`;
    workspace.dataset.contentPhase = r.moving ? r.open ? 'opening' : 'closing' : r.open && r.v===r.w ? 'open' : r.v===0 ? 'closed' : 'paused';
    workspace.dataset.sidebarPhase = l.moving ? l.open ? 'opening' : 'closing' : l.open ? 'open' : 'closed';
    $('fullscreen').disabled = r.moving || l.moving;
  }
  function reconcile() {
    if(state.right.moving || state.left.moving) return;
    state.mode = state.width < 900 ? 'narrow' : 'wide';
    const r=state.right,l=state.left;
    l.w = state.mode === 'narrow' ? state.width-2 : l.open?projection().sidebar:260; l.v = l.open ? l.w : 0;
    r.w = r.open?settledRight():r.w; r.v = r.open ? r.w : 0;
    render();
  }
  function move(which,open) {
    const d=state[which],inner=which==='right'?right:left;
    cancelAnimationFrame(d.raf);
    if(!d.moving) {
      if(open) d.w = which==='right'?settledRight(true):state.mode==='narrow'?state.width-2:projection(state.right.open,true).sidebar;
      else if(inner.contains(document.activeElement)) { if(which==='right')previousFocus=document.activeElement; $(which==='right'?'external-content':'external-sidebar').focus({preventScroll:true}); }
    }
    d.open=open; d.to=open?d.w:0;
    if(which==='right'&&!open) state.full=false;
    const from=d.v,to=d.to,started=performance.now(),duration=(open?560:420)*($('slow').checked?4:1);
    const finish=()=>{d.v=to;d.moving=false;d.raf=0;reconcile();if(which==='right'&&open&&previousFocus&&['external-content','content-restore'].includes(document.activeElement?.id)){const destination=previousFocus.isConnected?previousFocus:$('content-toggle');previousFocus=null;destination.focus({preventScroll:true});}};
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){finish();return;}
    d.moving=true; render();
    const step=now=>{const t=Math.min(1,(now-started)/duration);d.v=from+(to-from)*ease(t);render();if(t<1)d.raf=requestAnimationFrame(step);else finish();};
    d.raf=requestAnimationFrame(step);
  }
  const toggleRight=()=>move('right',!state.right.open),toggleLeft=()=>move('left',!state.left.open);
  for(const id of ['content-toggle','content-restore','external-content'])$(id).onclick=toggleRight;
  for(const id of ['sidebar-toggle','sidebar-restore','external-sidebar'])$(id).onclick=toggleLeft;
  $('window-width').onchange=event=>{state.width=Number(event.target.value);reconcile();render();};
  $('content-width').onchange=event=>{state.requested=Number(event.target.value);state.full=false;reconcile();};
  $('body-mode').onchange=event=>{$('manuscript').hidden=event.target.value!=='manuscript';$('form').hidden=event.target.value!=='form';$('tab-title').textContent=event.target.value==='form'?'角色 · 表单示意':'第一章 · 正文示意';};
  $('fullscreen').onclick=()=>{state.full=!state.full;reconcile();};
  $('progress').oninput=event=>{const r=state.right;cancelAnimationFrame(r.raf);r.raf=0;r.moving=false;r.v=r.w*Number(event.target.value)/100;r.open=r.v>0;render();};
  $('narrow-sidebar').onclick=()=>{if(state.right.open)move('right',false);move('left',true);};
  $('narrow-chat').onclick=()=>{if(state.left.open)move('left',false);if(state.right.open)move('right',false);};
  $('narrow-content').onclick=()=>{if(state.left.open)move('left',false);move('right',true);};
  for(const button of document.querySelectorAll('[data-theme-choice]'))button.onclick=()=>{document.documentElement.dataset.theme=button.dataset.themeChoice;for(const choice of document.querySelectorAll('[data-theme-choice]'))choice.setAttribute('aria-pressed',String(choice===button));};
  // Narrow content overlays chat; its left navigation begins closed.
  $('window-width').addEventListener('change',()=>{if(state.width<900&&!state.left.moving){state.left.open=false;reconcile();}});
  window.contentDrawerDesign = { read:()=>structuredClone({width:state.width,mode:state.mode,right:{w:state.right.w,v:state.right.v,open:state.right.open,moving:state.right.moving},left:{w:state.left.w,v:state.left.v,open:state.left.open,moving:state.left.moving}}),toggleRight,toggleLeft };
  render();
})();
