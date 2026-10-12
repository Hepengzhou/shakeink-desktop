// Local review controls only. No product bridge or persistence.
const canvas=document.querySelector('#canvas'),fit=document.querySelector('#fit'),shot=document.querySelector('#shot'),live=document.querySelector('#live')
let theme='paper',look='proposed',scene='settings'
const sceneNames={settings:'设置对话框',profile:'设置内用户编辑',wizard:'创作向导','wizard-detail':'向导内模板详情',planning:'规划表单样式示意',drawer:'规划侧边详情样式示意',confirm:'恢复默认快捷键确认',scenario:'试验场局部配置样式示意',menu:'账户菜单（排除项）'}
function render(){
  const simulated=['planning','drawer','scenario'].includes(scene)
  canvas.className=theme+' '+look;canvas.dataset.scene=scene
  live.hidden=!simulated
  document.querySelector('#form-dialog').hidden=scene!=='planning'
  document.querySelector('#drawer-dialog').hidden=scene!=='drawer'
  document.querySelector('#scenario-dialog').hidden=scene!=='scenario'
  const filename=simulated?`${theme}-workspace.png`:`${theme}-${scene}-${look}.png`
  shot.src=filename+'?v=2'
  shot.alt=`${theme==='paper'?'宣纸':'玄墨'} · ${sceneNames[scene]} · ${look==='proposed'?'拟议效果':'当前效果'}`
  const link=document.querySelector('#original');link.href=filename+'?v=2';link.hidden=simulated
  document.querySelectorAll('[data-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.theme===theme)))
  document.querySelectorAll('[data-look]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.look===look)))
  document.querySelector('#caption').textContent=simulated?'此场景为纯样式示意，背景使用隔离工作台截图；不表示实际业务操作或产品验收。':scene==='menu'?'实际账户菜单。它属于排除项，拟议方案不改变菜单样式，也不新增背景遮罩。':'实际隔离 Windows Electron React 组件截图；拟议图只临时注入 CSS，产品源码尚未修改。'
}
document.querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>{theme=button.dataset.theme;render()}))
document.querySelectorAll('[data-look]').forEach(button=>button.addEventListener('click',()=>{look=button.dataset.look;render()}))
document.querySelector('#scene').addEventListener('change',event=>{scene=event.target.value;render()})
function resize(){const scale=fit.clientWidth/1440;canvas.style.transform=`scale(${scale})`;fit.style.height=`${900*scale}px`}
new ResizeObserver(resize).observe(fit)
render();resize()
