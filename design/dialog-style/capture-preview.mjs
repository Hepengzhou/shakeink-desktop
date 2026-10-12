// Design only: existing compiled React app + CSS overrides in an isolated process.
import assert from 'node:assert/strict'
import { _electron } from 'playwright'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { defaultState, stateSchema } from '../../desktop/core/settings.ts'
import { VersionedStore } from '../../desktop/core/versioned-store.ts'
import { Workspaces } from '../../desktop/service/workspaces.ts'

const directory = resolve('design/dialog-style')
const isolated = await mkdtemp(join(tmpdir(), 'xaanink-dialog-design-'))
const root = join(isolated, 'data')
await mkdir(root, {recursive:true})
const workspaces=new Workspaces(root,resolve('prisma/migrations'))
try{await workspaces.initialize()}finally{await workspaces.close()}
const seed = structuredClone(defaultState)
seed.onboarding = {version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
await new VersionedStore(join(root,'state.json'), defaultState, stateSchema.parse).update(0,seed)
const env = {...process.env,XAANINK_TEST_ROOT:root}
delete env.ELECTRON_RUN_AS_NODE
const proposedCss = `
  .paper { --review-dialog-shadow: 0 12px 32px rgba(96,74,38,.14),0 2px 8px rgba(96,74,38,.08); }
  .ink { --review-dialog-shadow: 0 12px 32px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18); }
  [data-slot="dialog-overlay"] { background:rgba(0,0,0,.10)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important; }
  [data-slot="dialog-content"] { box-shadow:0 0 0 1px color-mix(in srgb,var(--foreground) 10%,transparent),var(--review-dialog-shadow)!important; }
  [data-review-dialog-layer] {background:rgba(0,0,0,.10)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
  [data-review-dialog-surface] {box-shadow:var(--review-dialog-shadow)!important;}
`
const records=[],errors=[],network=[]
let app, page
await mkdir(directory,{recursive:true})
try {
  app=await _electron.launch({args:[resolve('.')],env,timeout:60000})
  page=await app.firstWindow({timeout:60000})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(/^https?:/i.test(request.url()))network.push(request.url())})
  await page.context().setOffline(true)
  try{await page.getByRole('button',{name:'账号菜单',exact:true,includeHidden:true}).waitFor({state:'attached',timeout:20000})}
  catch(error){console.log(JSON.stringify({startupUrl:page.url(),headings:await page.getByRole('heading').allTextContents(),alerts:await page.getByRole('alert').allTextContents(),errors}));throw error}
  const state=await page.evaluate(()=>window.desktop.bootstrap())
  assert.equal(state.dataRoot,root);assert.equal(state.models.length,0)
  await page.getByRole('button',{name:'暂不配置',exact:true}).click()
  const runtime=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds({width:1440,height:900});return{electron:process.versions.electron,zoom:w.webContents.getZoomFactor()}})
  if(await page.getByRole('button',{name:'显示内容面板',exact:true}).isVisible())await page.getByRole('button',{name:'显示内容面板',exact:true}).click()
  await page.locator('.workspace-content').waitFor()
  let style
  async function capture(theme,scene){
    for(const look of ['current','proposed']){
      if(look==='proposed'){style=await page.addStyleTag({content:proposedCss})}
      await page.evaluate(()=>document.fonts.ready)
      await page.waitForTimeout(250)
      const info=await page.evaluate(()=>({
        theme:document.documentElement.className,
        viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,
        overlays:[...document.querySelectorAll('[data-slot="dialog-overlay"],[data-review-dialog-layer]')].filter(el=>!el.hidden).map(el=>{const s=getComputedStyle(el);return{background:s.backgroundColor,backdrop:s.backdropFilter,webkitBackdrop:s.webkitBackdropFilter}}),
        dialogs:[...document.querySelectorAll('[data-slot="dialog-content"],[data-review-dialog-surface]')].map(el=>({title:el.querySelector('[data-slot="dialog-title"],h2')?.textContent,shadow:getComputedStyle(el).boxShadow,rect:el.getBoundingClientRect().toJSON()}))
      }))
      if(look==='proposed'){
        const expected=scene==='menu'?0:['profile','confirm','wizard-detail'].includes(scene)?2:1
        assert.equal(info.dialogs.length,expected,`${scene}: expected real dialog surfaces`)
        assert(scene==='menu'?info.overlays.length===0:info.overlays.length>=1,`${scene}: expected real backdrop presence`)
        assert(info.overlays.every(s=>s.backdrop==='none'&&s.background==='rgba(0, 0, 0, 0.1)'))
        assert(info.dialogs.every(s=>s.shadow.includes('12px 32px')))
      }
      const filename=`${theme}-${scene}-${look}.png`
      await page.screenshot({path:join(directory,filename)})
      const {width,height}=await sharp(join(directory,filename)).metadata()
      assert.equal(width,Math.round(info.viewport.width*info.dpr));assert.equal(height,Math.round(info.viewport.height*info.dpr))
      assert.equal(info.viewport.width,1440);assert.equal(info.viewport.height,900)
      records.push({filename,theme,scene,look,pngDimensions:{width,height},...info})
      if(style){await style.evaluate(el=>el.remove());style=undefined}
    }
  }
  for(const theme of ['paper','ink']){
    await page.evaluate(async theme=>{const state=await window.desktop.bootstrap();await window.desktop.settings({type:'update',revision:state.revision,settings:{...state.settings,appearance:{...state.settings.appearance,theme}}})},theme)
    await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    await page.screenshot({path:join(directory,`${theme}-workspace.png`)})
    await page.getByRole('button',{name:'账号菜单',exact:true}).click()
    await page.getByRole('menuitem',{name:'设置',exact:true}).click()
    await page.getByRole('button',{name:'外观',exact:true}).click()
    await capture(theme,'settings')
    await page.getByRole('button',{name:'用户',exact:true}).click()
    await page.getByRole('button',{name:'编辑用户',exact:true}).click()
    await capture(theme,'profile')
    await page.getByRole('button',{name:'关闭编辑用户',exact:true}).click()
    await page.getByRole('button',{name:'快捷键',exact:true}).click()
    await page.getByRole('button',{name:'恢复默认',exact:true}).click()
    await capture(theme,'confirm')
    await page.getByRole('dialog',{name:'恢复默认快捷键',exact:true}).getByRole('button',{name:'取消',exact:true}).click()
    await page.getByRole('button',{name:'关闭设置',exact:true}).click()
    await page.getByRole('button',{name:'账号菜单',exact:true}).click()
    await capture(theme,'menu')
    await page.keyboard.press('Escape')
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('desktop:command',{detail:'file.new'})))
    await page.getByRole('dialog',{name:'创作向导',exact:true}).waitFor()
    await capture(theme,'wizard')
    await page.getByRole('button',{name:/^空白模板/}).dblclick()
    await page.getByRole('button',{name:'关闭详情',exact:true}).waitFor()
    await page.getByRole('button',{name:'关闭详情',exact:true}).evaluate(el=>{const surface=el.closest('.flex.max-h-full');surface.setAttribute('data-review-dialog-surface','');surface.parentElement.setAttribute('data-review-dialog-layer','')})
    await capture(theme,'wizard-detail')
    await page.getByRole('button',{name:'关闭详情',exact:true}).click()
    await page.keyboard.press('Escape')
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[])
  const sourceHashes={}
  for(const filename of ['src/components/ui/dialog.tsx','src/app/desktop.css','src/components/content/planning/planning.module.css','dist/main/index.cjs'])sourceHashes[filename]=createHash('sha256').update(await readFile(filename)).digest('hex')
  await writeFile(join(directory,'preview-observations.json'),JSON.stringify({revision:'v2',overlayOpacity:.10,purpose:'UI design preview only; temporary CSS in existing compiled Electron; no product implementation or acceptance',runtime,records,sourceHashes,pageErrors:errors,rendererHttpRequests:network,networkObservationScope:'firstWindow returned through capture completion; renderer only; not main/worker startup network acceptance',isolatedData:true,models:0},null,2)+'\n')
  console.log(JSON.stringify({purpose:'design-only',captures:records.length,errors:errors.length,rendererHttpRequests:network.length}))
}finally{await app?.close()}
