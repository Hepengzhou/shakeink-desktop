// Offline design QA, never product/native acceptance. Uses only synthetic fixtures.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const directory=resolve('design/sidebar-navigation')
const sources=['src/components/layout/SidebarTree.tsx','src/components/layout/ContentTabs.tsx','src/components/layout/DashboardShell.tsx','src/components/content/scene/SceneTree.tsx','src/components/desktop/UnavailableWorks.tsx','src/app/desktop.css']
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])))
const before=await hashes()
const report={revision:'v7',scope:'Offline synthetic HTML design in headless Windows Chrome. Not real React product, Electron, installed package, macOS or physical keyboard acceptance.',status:'running',checks:[],pageErrors:[],httpRequests:[],sourceHashes:before,productTests:'not-run',nativeAcceptance:'not-run'}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage({viewport:{width:1440,height:1200}})
page.setDefaultTimeout(8000)
page.on('pageerror',error=>report.pageErrors.push(error.message))
page.on('request',request=>{if(/^https?:/i.test(request.url()))report.httpRequests.push(request.url())})
await page.route(/^https?:\/\//,route=>route.abort())
const check=(name,evidence={})=>report.checks.push({name,...evidence})
const screenshot=async name=>{await page.screenshot({path:join(directory,`${name}.png`),fullPage:true});return `${name}.png`}
const sidebar=page.getByRole('complementary',{name:'左侧导航设计示意'})
const library=page.getByRole('dialog',{name:'情景试验场',exact:true})
const navScenario=sidebar.locator('[data-node="scenario"] .row-main')
const waitMeasured=async()=>{
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.nav-label')).filter(el=>el.getBoundingClientRect().width>0).every(el=>el.dataset.overflow===String(el.scrollWidth>el.clientWidth+1)))
}
const inspectLabels=()=>page.locator('.nav-label').evaluateAll(elements=>elements.filter(el=>el.getBoundingClientRect().width>0).map(el=>({text:el.textContent,width:el.clientWidth,scrollWidth:el.scrollWidth,overflow:el.dataset.overflow,mask:getComputedStyle(el).maskImage,textOverflow:getComputedStyle(el).textOverflow,title:el.title})))
const focusIs=async selector=>{await page.waitForFunction(selector=>document.querySelector(selector)===document.activeElement,selector);assert.equal(await page.locator(selector).evaluate(el=>el===document.activeElement),true,`focus ${selector}`)}
try{
  await page.goto(pathToFileURL(join(directory,'index.html')).href);await page.evaluate(()=>document.fonts.ready);await waitMeasured()
  report.browser=await browser.version()
  const geometry=await sidebar.evaluate(el=>{
    const buttons=[...el.querySelectorAll('.create-action')].map(el=>el.getBoundingClientRect())
    const footer=el.querySelector('.account-footer').getBoundingClientRect(),account=el.querySelector('.account-button').getBoundingClientRect(),avatar=el.querySelector('.avatar').getBoundingClientRect()
    return {sidebar:el.getBoundingClientRect().width,createHeights:buttons.map(r=>r.height),createGap:buttons[1].top-buttons[0].bottom,footerHeight:footer.height,accountHeight:account.height,avatar:avatar.width,createTypography:[...el.querySelectorAll('.create-action')].map(el=>{const style=getComputedStyle(el),br=el.getBoundingClientRect(),ir=el.querySelector('svg').getBoundingClientRect(),tr=el.querySelector('.nav-label').getBoundingClientRect();return {fontSize:style.fontSize,lineHeight:style.lineHeight,fontWeight:style.fontWeight,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,gap:style.gap,iconCentreError:Math.abs(ir.top+ir.height/2-br.top-br.height/2),textCentreError:Math.abs(tr.top+tr.height/2-br.top-br.height/2)}}),icons:[...el.querySelectorAll('.create-action')].map(el=>({name:el.dataset.icon,size:el.querySelector('svg').getBoundingClientRect().width,stroke:getComputedStyle(el.querySelector('svg')).strokeWidth}))}
  })
  assert.equal(geometry.sidebar,260);assert.deepEqual(geometry.createHeights,[32,32]);assert.equal(geometry.createGap,4);assert.equal(geometry.footerHeight,72);assert.equal(geometry.accountHeight,52);assert.equal(geometry.avatar,32)
  for(const type of geometry.createTypography){assert.equal(type.fontSize,'14px');assert.equal(type.lineHeight,'20px');assert.equal(type.fontWeight,'500');assert.equal(type.paddingLeft,'12px');assert.equal(type.paddingRight,'12px');assert.equal(type.gap,'10px');assert.ok(type.iconCentreError<.1&&type.textCentreError<.1)}
  assert.deepEqual(geometry.icons.map(i=>i.name),['NotebookPen','MessageCirclePlus']);assert.ok(geometry.icons.every(i=>i.size===18&&i.stroke==='1.7px'))
  assert.equal(await sidebar.locator('[data-icon="MessageCirclePlus"] svg path').count(),3)
  assert.equal(await sidebar.getByRole('button',{name:'创建对话',exact:true}).count(),0)
  check('v7 new-conversation label and circle-plus icon; 32px rows, 4px gap, 14/20px centred typography and 72/52/32px account',geometry)
  assert.equal(await sidebar.getByRole('button',{name:'属性',exact:true}).count(),0)
  assert.equal(await sidebar.locator('[data-node="scenario"] .row-toggle').count(),0)
  assert.equal(await sidebar.locator('[data-node^="trial-"]').count(),0)
  assert.equal(await sidebar.getByText('暂无试验场',{exact:true}).count(),0)
  assert.equal(await sidebar.locator('[data-node="scenes"] .row-toggle').count(),0)
  assert.equal(await sidebar.locator('[data-node="scene"],[data-node="scene-parent"],[data-node="scene-child"]').count(),0)
  await sidebar.locator('[data-node="scenes"] .row-main').click();assert.ok((await page.locator('.review-message').innerText()).includes('原场景面板'))
  check('No attribute entry; scene/scenario are single entries without expand arrows, children or inline empty states; scene opens original destination')
  const short=await inspectLabels();assert.ok(short.some(label=>label.overflow==='false'&&label.mask==='none'))
  check('Short labels have no mask; titles remain complete', {shortLabels:short.filter(label=>label.overflow==='false').length})
  await sidebar.getByRole('button',{name:'创建作品',exact:true}).click();assert.ok((await page.locator('.review-message').innerText()).includes('现有创建作品向导'))
  const newConversation=sidebar.getByRole('button',{name:'新对话',exact:true})
  const ordinaryConversation=()=>newConversation.evaluate(el=>{const s=getComputedStyle(el),icon=getComputedStyle(el.querySelector('svg'));return {background:s.backgroundColor,color:s.color,iconColor:icon.color,fontWeight:s.fontWeight,active:el.classList.contains('active'),selected:el.getAttribute('aria-selected'),pressed:el.getAttribute('aria-pressed')}})
  await page.mouse.move(0,0);const initialConversation=await ordinaryConversation();assert.equal(initialConversation.background,'rgba(0, 0, 0, 0)');assert.equal(initialConversation.active,false);assert.equal(initialConversation.selected,null);assert.equal(initialConversation.pressed,null)
  await newConversation.click();assert.ok((await page.locator('.review-message').innerText()).includes('新对话'));await page.mouse.move(0,0);assert.deepEqual(await ordinaryConversation(),initialConversation)
  check('New conversation is an ordinary action before and after activation: no selected background, text/icon branch or selected/pressed semantics',initialConversation)
  check('Creation buttons demonstrate their original destinations without creating actual data')
  await screenshot('preview-ink')
  await page.getByRole('button',{name:'宣纸',exact:true}).click();assert.equal(await page.locator('html').getAttribute('class'),'paper');await screenshot('preview-paper')
  check('Both themes use existing sidebar palette and geometry')
  await page.getByLabel('内容',{exact:true}).selectOption('long');await waitMeasured()
  const long=await inspectLabels();assert.ok(long.filter(item=>item.overflow==='true').length>=7)
  for(const item of long){assert.equal(item.textOverflow,'clip');assert.equal(item.title,item.text);assert.equal(item.mask!=='none',item.overflow==='true');if(item.overflow==='true')assert.ok(item.mask.includes('24px'))}
  for(const id of ['novel','world','character','chapter','conversation','unbound-conversation'])assert.equal(await page.getByTestId(`label-${id}`).getAttribute('data-overflow'),'true',id)
  assert.equal(await page.getByTestId('unavailable-title').getAttribute('data-overflow'),'true')
  assert.ok(long.some(item=>item.text.includes('long.review')&&item.overflow==='true'))
  check('Long names fade only their last 24px across works/worlds/characters/chapters/conversations/unavailable works/account and matching Tabs', {overflowLabels:long.filter(item=>item.overflow==='true').map(item=>item.text)})
  const tag=await sidebar.locator('.role-tag').boundingBox(),row=await sidebar.locator('[data-node="character"]').boundingBox();assert.ok(tag.x+tag.width<=row.x+row.width)
  await sidebar.locator('[data-node="scenario"]').hover();assert.equal(await sidebar.locator('.row-action').evaluate(el=>getComputedStyle(el).opacity),'1')
  check('Main-role badge and scenario action retain fixed visible space')
  await screenshot('preview-long-paper')
  await page.getByRole('button',{name:'玄墨',exact:true}).click();await screenshot('preview-long-ink')
  for(const value of ['200','420','260']){await page.getByLabel('栏宽',{exact:true}).selectOption(value);await waitMeasured();assert.equal((await sidebar.boundingBox()).width,Number(value))}
  await page.getByLabel('栏宽',{exact:true}).selectOption('420');await waitMeasured();assert.equal(await page.getByTestId('unavailable-title').getAttribute('data-overflow'),'false')
  check('Resize recalculates overflow; a previously clipped label becomes fully visible at 420px')
  await page.getByLabel('栏宽',{exact:true}).selectOption('200');await page.getByLabel('窗口高度',{exact:true}).selectOption('500');await waitMeasured()
  const tree=sidebar.locator('.tree-scroll'),fixedBefore=await sidebar.locator('.create-actions,.account-footer').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height})))
  assert.ok(await tree.evaluate(el=>el.scrollHeight>el.clientHeight));await tree.hover();await page.mouse.wheel(0,1200);await page.waitForFunction(()=>document.querySelector('.tree-scroll').scrollTop>0)
  assert.deepEqual(await sidebar.locator('.create-actions,.account-footer').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height}))),fixedBefore)
  assert.equal(await sidebar.evaluate(el=>el.scrollWidth>el.clientWidth),false)
  await screenshot('preview-short-narrow');check('200px wide / 500px high retains fixed top and account while tree scrolls; no horizontal overflow')
  await page.getByLabel('窗口高度',{exact:true}).selectOption('640');assert.equal((await sidebar.boundingBox()).height,640)
  await page.getByLabel('窗口高度',{exact:true}).selectOption('900');await page.getByLabel('栏宽',{exact:true}).selectOption('260');await waitMeasured()
  await sidebar.getByRole('button',{name:/^账号菜单/}).click();const accountMenu=sidebar.getByRole('menu',{name:'账号菜单',exact:true});await accountMenu.waitFor();await waitMeasured()
  assert.equal(await accountMenu.locator('.account-name').getAttribute('data-overflow'),'true');assert.equal(await accountMenu.locator('.account-email').getAttribute('data-overflow'),'true')
  await page.keyboard.press('ArrowDown');await focusIs('.account-menu [role="menuitem"]:nth-of-type(2)');await page.keyboard.press('Escape');await accountMenu.waitFor({state:'hidden'});await focusIs('.account-button')
  check('Account menu includes conditional fading for name/email; arrow navigation and Escape restore trigger focus')
  await sidebar.getByRole('button',{name:/^账号菜单/}).click();await screenshot('preview-account');await page.keyboard.press('Escape')
  await navScenario.click();await library.waitFor();await focusIs('[data-focus="new-scenario"]')
  assert.equal(await library.locator('.scenario-item').count(),2);assert.equal(await sidebar.locator('[data-node^="trial-"]').count(),0)
  await screenshot('preview-scenario-library');await page.keyboard.press('Escape');await library.waitFor({state:'hidden'});await focusIs('[data-node="scenario"] .row-main')
  check('Single scenario entry opens managed list with unchanged navigation, and closes to the entry')
  await sidebar.getByRole('button',{name:'新建情景试验场',exact:true}).click();await page.getByRole('dialog',{name:'新建情景试验场',exact:true}).waitFor();await page.keyboard.press('Escape');await focusIs('.row-action');assert.equal(await library.isVisible(),false)
  check('Direct plus creation cancellation returns to plus without opening a list')
  await navScenario.click();await library.getByRole('button',{name:'新建情景试验场',exact:true}).click();await page.getByRole('dialog',{name:'新建情景试验场',exact:true}).getByRole('button',{name:'取消',exact:true}).click();await focusIs('[data-focus="new-scenario"]')
  check('Creation opened from library returns to library new button on cancellation')
  await library.getByLabel('试验场示意状态').selectOption('empty');assert.equal(await library.getByText('暂无试验场',{exact:true}).count(),1)
  await library.getByLabel('试验场示意状态').selectOption('loading');assert.equal(await library.getByRole('status').count(),1)
  await library.getByLabel('试验场示意状态').selectOption('error');assert.equal(await library.getByRole('alert').count(),1);await library.getByRole('button',{name:'重试',exact:true}).click();assert.equal(await library.locator('.scenario-item').count(),2)
  check('Scenario empty/loading/error/retry remain distinct and create stays reachable')
  const more=library.locator('.scenario-more').first();await more.click();await library.getByRole('menuitem',{name:'重命名',exact:true}).click();await page.getByRole('dialog',{name:'重命名情景试验场',exact:true}).getByRole('button',{name:'取消',exact:true}).click();await focusIs('[data-focus="open-trial-1"]')
  await more.click();await library.getByRole('menuitem',{name:'重命名',exact:true}).click();await page.getByLabel('名称',{exact:true}).fill('重命名后的合成试验场');await page.getByRole('dialog',{name:'重命名情景试验场',exact:true}).getByRole('button',{name:'保存',exact:true}).click();await focusIs('[data-focus="open-trial-1"]');assert.equal(await library.getByRole('button',{name:'重命名后的合成试验场',exact:true}).count(),1)
  check('Rename cancellation and successful synthetic rename return to the original record')
  await more.click();await library.getByRole('menuitem',{name:'删除',exact:true}).click();await page.getByRole('dialog',{name:'删除情景试验场',exact:true}).getByRole('button',{name:'取消',exact:true}).click();await focusIs('[data-focus="open-trial-1"]')
  await more.click();await library.getByRole('menuitem',{name:'删除',exact:true}).click();await page.getByRole('dialog',{name:'删除情景试验场',exact:true}).getByRole('button',{name:'确认删除',exact:true}).click();await focusIs('[data-focus="new-scenario"]');assert.equal(await library.locator('.scenario-item').count(),1)
  check('Delete cancellation preserves list; synthetic confirmed deletion restores new button focus')
  await library.locator('.scenario-open').first().click();await library.waitFor({state:'hidden'});assert.ok((await page.locator('.review-message').innerText()).includes('原情景试验场详情 Tab'));assert.ok((await sidebar.locator('[data-node="scenario"]').getAttribute('class')).includes('active'))
  check('Opening a synthetic existing record closes list and highlights the single scenario entry')
  await navScenario.click();await library.getByRole('button',{name:'新建情景试验场',exact:true}).click();await page.getByLabel('名称',{exact:true}).fill('新建的合成试验场');await page.getByRole('dialog',{name:'新建情景试验场',exact:true}).getByRole('button',{name:'创建',exact:true}).click();await library.waitFor({state:'hidden'});assert.ok((await page.locator('.review-message').innerText()).includes('新建的合成试验场'))
  check('Synthetic create success demonstrates opening original detail without adding tree children')
  for(const state of ['empty','loading','error']){await page.getByLabel('内容',{exact:true}).selectOption(state);assert.equal(await sidebar.locator('.create-action').count(),2);assert.equal((await sidebar.locator('.account-footer').boundingBox()).height,72);assert.equal(await sidebar.locator('[data-node="scenario"]').count(),0)}
  await sidebar.getByRole('button',{name:'重新加载作品',exact:true}).click();await waitMeasured();assert.equal(await navScenario.count(),1)
  check('Empty/loading/error work states preserve creation and account; retry returns populated view')
  await page.getByLabel('内容',{exact:true}).selectOption('long');await page.setViewportSize({width:480,height:800});await page.getByLabel('栏宽',{exact:true}).selectOption('420');await waitMeasured()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await navScenario.click();await library.waitFor();const rect=await library.boundingBox();assert.ok(rect.x>=16&&rect.x+rect.width<=464&&rect.y>=16&&rect.y+rect.height<=784)
  await screenshot('preview-small-viewer');await page.keyboard.press('Escape');check('480px review viewport fits 420px sidebar and bounds management dialog', {dialog:rect})

  await page.setViewportSize({width:1440,height:1200});await page.getByLabel('栏宽',{exact:true}).selectOption('260');await page.getByLabel('窗口高度',{exact:true}).selectOption('900');await page.getByLabel('内容',{exact:true}).selectOption('normal')
  const categories=sidebar.getByRole('tablist',{name:'导航分类',exact:true}),panel=sidebar.getByRole('tabpanel')
  const chooseCategory=async label=>{await categories.getByRole('tab',{name:label,exact:true}).click();await waitMeasured();assert.equal(await categories.locator('[aria-selected="true"]').count(),1);assert.equal(await panel.getAttribute('aria-labelledby'),await categories.getByRole('tab',{name:label,exact:true}).getAttribute('id'))}
  assert.deepEqual(await categories.getByRole('tab').allTextContents(),['作品','设定','角色','正文','对话']);assert.equal(await sidebar.getByText('作品阁',{exact:true}).count(),0)
  assert.equal(await categories.locator('[tabindex="0"]').count(),1);assert.equal(await categories.locator('[tabindex="-1"]').count(),4)
  check('Five single-row category Tabs replace works heading; one selected item, one tab stop and a labelled panel')
  await chooseCategory('作品');const workIcon=panel.locator('[data-node="novel"] .row-main>[data-nav-icon]'),workToggle=panel.locator('[data-node="novel"] .row-toggle')
  assert.equal(await workIcon.getAttribute('data-nav-icon'),'FolderOpen');await workToggle.click();assert.equal(await workIcon.getAttribute('data-nav-icon'),'FolderClosed');assert.equal(await panel.locator('[data-node="settings"]').count(),0);await panel.locator('[data-node="novel"] .row-main').click();assert.equal(await workIcon.getAttribute('data-nav-icon'),'FolderOpen');assert.equal(await panel.locator('[data-node="settings"]').count(),1)
  assert.equal(await panel.locator('[data-node="gift"] [data-nav-icon="Pointer"]').count(),1);assert.equal(await panel.locator('[data-node="gift"] [data-nav-icon="Pointer"] path').count(),5)
  check('Default project folder switches open/closed with real prototype expansion, work activation still expands; golden finger uses the installed Pointer hand icon')
  await page.evaluate(()=>{window.__reviewTabDemo=document.querySelector('.tab-demo')})
  const extraSettings=['items','scenario','scenes','worldline','narrative','outline']
  const allowedKinds={'设定':['setting','world',...extraSettings],'角色':['character'],'正文':['volume','chapter'],'对话':['conversation']}
  const viewResults=[]
  for(const name of ['设定','角色','正文','对话']){
    await chooseCategory(name)
    const kinds=await panel.locator('[data-kind]').evaluateAll(els=>els.map(el=>el.dataset.kind))
    assert.ok(kinds.length>0&&kinds.every(kind=>allowedKinds[name].includes(kind)),name)
    assert.equal(await panel.locator('[data-group="novel"]').count(),1);assert.equal(await panel.locator('[data-group="novel-2"]').count(),1)
    assert.equal(await panel.locator('[data-work="novel"][data-kind]').count()>0,true);assert.equal(await panel.locator('[data-work="novel-2"][data-kind]').count()>0,true)
    assert.equal(await page.evaluate(()=>window.__reviewTabDemo===document.querySelector('.tab-demo')),true)
    if(name!=='设定')assert.equal(await panel.locator(extraSettings.map(id=>`[data-kind="${id}"]`).join(',')).count(),0)
    else for(const work of ['novel','novel-2']){const rows=panel.locator(`[data-work="${work}"][data-kind]`),suffix=work==='novel'?'':'-2';assert.deepEqual((await rows.evaluateAll(els=>els.map(el=>el.dataset.node))).slice(-6),extraSettings.map(id=>id+suffix));for(const id of extraSettings){const row=panel.locator(`[data-node="${id+suffix}"]`);assert.equal(await row.count(),1);assert.equal(await row.locator('.row-toggle').count(),0)}}
    viewResults.push({name,kinds,works:2});await screenshot(`preview-category-${await panel.getAttribute('data-view')}`)
  }
  check('Each filtered view covers both works and exclusively its requested category; reference content node remains mounted', {views:viewResults})
  await chooseCategory('设定');const settingsActions=[]
  for(const [work,owner,suffix] of [['novel','雨灯纪事',''],['novel-2','风渡行记','-2']]){
    for(const [id,label] of [['items','物品'],['scenes','场景'],['worldline','世界线'],['narrative','叙事线'],['outline','大纲']]){await panel.locator(`[data-node="${id+suffix}"] .row-main`).click();const message=await page.locator('.review-message').innerText();assert.ok(message.includes(owner)&&message.includes(`原${label}面板`));assert.equal(await panel.getAttribute('data-view'),'settings');settingsActions.push({work,id,label,owner})}
    await panel.locator(`[data-node="scenario${suffix}"] .row-main`).click();await library.waitFor();assert.ok((await library.locator('.dialog-description').innerText()).includes(owner));await page.keyboard.press('Escape');await focusIs(`[data-node="scenario${suffix}"] .row-main`)
    await panel.locator(`[data-node="scenario${suffix}"] .row-action`).click();await page.getByRole('dialog',{name:'新建情景试验场',exact:true}).waitFor();await page.keyboard.press('Escape');await focusIs(`[data-node="scenario${suffix}"] .row-action`)
  }
  await panel.evaluate(el=>el.scrollTop=0);await screenshot('preview-v7-settings');check('All six extra settings entries exist in both works, preserve owner and original destinations; scene/scenario stay single-row and scenario cancellation returns to its actual settings trigger',{actions:settingsActions})
  await chooseCategory('角色');assert.equal(await panel.locator('[data-kind="character"]').count(),10);assert.equal(await panel.locator('.row-toggle').count(),0);assert.equal(await panel.locator('.role-tag').filter({hasText:'伏笔'}).count(),2)
  await panel.locator('[data-node="character"] .row-main').click();assert.ok((await page.locator('.review-message').innerText()).includes('林舟'))
  check('Characters flatten names with identity badges and include foreshadow characters; original item destination remains selectable')
  await page.getByLabel('内容',{exact:true}).selectOption('character-error');assert.equal(await panel.getByRole('alert').count(),1);assert.equal(await panel.locator('[data-work="novel"][data-kind="character"]').count(),4);assert.equal(await panel.locator('[data-work="novel-2"][data-kind="character"]').count(),5);assert.equal(await panel.getByText('暂无角色',{exact:true}).count(),0)
  await panel.getByRole('button',{name:'重试伏笔角色',exact:true}).click();assert.equal(await panel.locator('[data-kind="character"]').count(),10)
  check('Synthetic foreshadow-query failure is an error, not empty; formal roles and other work stay visible, retry restores list')
  await chooseCategory('正文');assert.equal(await panel.locator('[data-kind="volume"]').count(),2);assert.equal(await panel.locator('[data-kind="chapter"]').count(),4)
  await panel.locator('[data-node="chapter"] .row-main').click();assert.ok((await page.locator('.review-message').innerText()).includes('第一章'))
  assert.equal(await panel.getByRole('button',{name:/正文导航功能菜单$/}).count(),2)
  await page.getByLabel('内容',{exact:true}).selectOption('category-empty');assert.equal(await panel.getByText('暂无正文',{exact:true}).count(),2);assert.equal(await panel.getByText('暂无大纲，去生成',{exact:true}).count(),0);assert.equal(await panel.locator('[data-kind]').count(),0)
  const rootMenu=panel.getByRole('button',{name:/正文导航功能菜单$/}).first();await rootMenu.click();const manuscriptMenu=page.getByRole('menu',{name:/正文导航功能$/});await manuscriptMenu.waitFor();assert.deepEqual(await manuscriptMenu.getByRole('menuitem').allTextContents(),['添加卷','导出整书正文','删除全部卷章']);await manuscriptMenu.getByRole('menuitem',{name:'添加卷',exact:true}).click();assert.ok((await page.locator('.review-message').innerText()).includes('添加卷'))
  await rootMenu.click();await manuscriptMenu.waitFor();await page.keyboard.press('Escape');await manuscriptMenu.waitFor({state:'hidden'});assert.equal(await rootMenu.evaluate(el=>el===document.activeElement),true)
  await screenshot('preview-category-empty');check('Manuscript retains volumes/chapters and whole-work menu; empty body still allows add-volume and never points to outline')
  await chooseCategory('角色');assert.equal(await panel.getByText('暂无角色',{exact:true}).count(),2)
  await chooseCategory('对话');assert.equal(await panel.getByText('暂无对话',{exact:true}).count(),2);assert.equal(await panel.locator('[data-work="unbound"][data-kind="conversation"]').count(),1)
  await page.getByLabel('内容',{exact:true}).selectOption('normal');assert.equal(await panel.locator('[data-kind="conversation"]').count(),3)
  check('Per-work empty labels stay distinct; unbound conversations remain accessible even alongside empty work conversation lists')
  await categories.getByRole('tab',{name:'作品',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await panel.getAttribute('data-view'),'settings');await focusIs('#nav-tab-settings')
  await page.keyboard.press('ArrowRight');assert.equal(await panel.getAttribute('data-view'),'characters')
  await page.keyboard.press('End');assert.equal(await panel.getAttribute('data-view'),'conversations');await focusIs('#nav-tab-conversations')
  await page.keyboard.press('Home');assert.equal(await panel.getAttribute('data-view'),'works');await page.keyboard.press('ArrowLeft');assert.equal(await panel.getAttribute('data-view'),'conversations')
  await page.keyboard.press('ArrowRight');assert.equal(await panel.getAttribute('data-view'),'works');await page.keyboard.press('Space');assert.equal(await panel.getAttribute('data-view'),'works')
  check('Arrow keys, Home/End, wrapping and Space operate category Tabs with focus on the selected item')
  await page.getByLabel('栏宽',{exact:true}).selectOption('200');await page.getByLabel('窗口高度',{exact:true}).selectOption('500')
  await panel.evaluate(el=>el.scrollTop=210);assert.equal(await panel.evaluate(el=>el.scrollTop),210)
  await chooseCategory('设定');await panel.locator('[data-node="worlds"] .row-toggle').click();assert.equal(await panel.locator('[data-node="world"]').count(),0);await panel.evaluate(el=>el.scrollTop=60)
  await chooseCategory('角色');await chooseCategory('设定');assert.equal(await panel.evaluate(el=>el.scrollTop),60);assert.equal(await panel.locator('[data-node="world"]').count(),0)
  await chooseCategory('作品');assert.equal(await panel.evaluate(el=>el.scrollTop),210);assert.equal(await panel.locator('[data-node="world"]').count(),1)
  await panel.locator('[data-node="novel"] .row-toggle').click();await chooseCategory('设定');assert.equal(await panel.locator('[data-work="novel"][data-kind="setting"]').count()>0,true)
  await chooseCategory('作品');assert.equal(await panel.locator('[data-node="novel"] .row-toggle').getAttribute('aria-expanded'),'false');await panel.locator('[data-node="novel"] .row-toggle').click()
  await panel.locator('[data-node="unbound"] .row-toggle').click();await chooseCategory('对话');assert.equal(await panel.locator('[data-work="unbound"][data-kind="conversation"]').count(),1);await chooseCategory('作品');assert.equal(await panel.locator('[data-node="unbound-conversation"]').count(),0);await panel.locator('[data-node="unbound"] .row-toggle').click()
  check('Each view restores its scroll and expansion; filtered contents do not depend on collapsed works or unbound guide')
  const tabGeometry=[],tabStyles=[]
  for(const theme of ['宣纸','玄墨']){await page.getByRole('button',{name:theme,exact:true}).click();for(const width of ['200','260','420']){await page.getByLabel('栏宽',{exact:true}).selectOption(width);for(const name of ['作品','设定','角色','正文','对话']){await chooseCategory(name);const items=await categories.getByRole('tab').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,labelOverflow:el.querySelector('.nav-label').dataset.overflow,text:el.textContent})));assert.ok(items.every(item=>item.height===28&&item.labelOverflow==='false'));assert.equal(await sidebar.evaluate(el=>el.scrollWidth>el.clientWidth),false);tabGeometry.push({theme,width:Number(width),view:name,items});const style=await categories.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderTopWidth,radius:s.borderRadius,primary:getComputedStyle(document.querySelector('.review-links a')).color,reference:(()=>{const c=getComputedStyle(document.querySelector('.tab-example'));return {background:c.backgroundColor,color:c.color,borderColor:c.borderTopColor}})(),items:Array.from(el.querySelectorAll('[role="tab"]')).map(tab=>{const c=getComputedStyle(tab);return {selected:tab.getAttribute('aria-selected')==='true',background:c.backgroundColor,color:c.color,radius:c.borderRadius,border:c.borderTopWidth,borderColor:c.borderTopColor,weight:c.fontWeight}})}});assert.equal(style.background,'rgba(0, 0, 0, 0)');assert.equal(style.border,'0px');assert.equal(style.radius,'0px');for(const tab of style.items){assert.equal(tab.border,'1px');assert.equal(tab.radius,'6px');if(tab.selected){assert.equal(tab.background,style.reference.background);assert.equal(tab.color,style.reference.color);assert.notEqual(tab.color,style.primary);assert.equal(tab.borderColor,style.reference.borderColor);assert.equal(tab.weight,'600')}else{assert.equal(tab.background,'rgba(0, 0, 0, 0)');assert.equal(tab.borderColor,'rgba(0, 0, 0, 0)');assert.notEqual(tab.color,style.primary)}}tabStyles.push({theme,width:Number(width),view:name,...style})}}}
  check('Both themes, all three widths and five views fit five complete 28px Tab buttons without horizontal overflow', {combinations:tabGeometry.length})
  check('Tab group stays transparent; selected bubble exactly matches the neutral reference Tab background/foreground/1px edge and 6px radius in all 30 combinations',{combinations:tabStyles.length,styles:tabStyles})
  const hoverStyles=[]
  for(const theme of ['宣纸','玄墨']){await page.getByRole('button',{name:theme,exact:true}).click();await chooseCategory('作品');for(const name of ['设定','角色','正文','对话']){const tab=categories.getByRole('tab',{name,exact:true});await tab.hover();const style=await tab.evaluate(el=>({background:getComputedStyle(el).backgroundColor,selected:el.getAttribute('aria-selected')}));assert.equal(style.background,'rgba(0, 0, 0, 0)');assert.equal(style.selected,'false');hoverStyles.push({theme,name,...style})}await newConversation.click();await page.mouse.move(0,0);const action=await ordinaryConversation();assert.equal(action.background,'rgba(0, 0, 0, 0)');assert.equal(action.active,false);assert.notEqual(action.color,(await tabStyles.find(item=>item.theme===theme)).primary)}
  await categories.getByRole('tab',{name:'设定',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await categories.getByRole('tab',{name:'角色',exact:true}).evaluate(el=>getComputedStyle(el).outlineStyle),'solid');await chooseCategory('作品');await panel.locator('[data-node="conversation"] .row-main').click();await newConversation.click();await chooseCategory('设定');await page.mouse.move(0,0);assert.equal((await ordinaryConversation()).active,false);assert.equal((await ordinaryConversation()).background,'rgba(0, 0, 0, 0)')
  check('Unselected Tab hover stays transparent in both themes; keyboard focus remains visible and new-conversation action stays neutral after history and category changes',{hoverStyles})
  await page.getByLabel('窗口高度',{exact:true}).selectOption('900');await page.getByLabel('栏宽',{exact:true}).selectOption('260');await page.getByLabel('内容',{exact:true}).selectOption('long');await chooseCategory('角色');await waitMeasured();assert.equal(await page.getByTestId('group-novel').getAttribute('data-overflow'),'true');assert.equal(await page.getByTestId('label-character').getAttribute('data-overflow'),'true');await screenshot('preview-category-long-characters')
  check('Filtered work headings and character names use the same conditional fade without masking role badges')
  await page.getByLabel('内容',{exact:true}).selectOption('normal');await chooseCategory('作品');await panel.locator('[data-node="novel-2"] .row-main').click();await panel.locator('[data-node="scenes-2"] .row-main').click();assert.ok((await page.locator('.review-message').innerText()).includes('风渡行记'))
  await panel.locator('[data-node="scenario-2"] .row-main').click();await library.waitFor();assert.ok((await library.locator('.dialog-description').innerText()).includes('风渡行记'));assert.equal(await library.locator('.scenario-item').count(),1);await page.keyboard.press('Escape')
  await navScenario.click();await library.waitFor();assert.ok((await library.locator('.dialog-description').innerText()).includes('雨灯纪事'));assert.equal(await library.locator('.scenario-item').count(),2);await page.keyboard.press('Escape')
  check('Multiple-work scene/scenario destinations retain ownership and independent synthetic records')
  await chooseCategory('作品');await panel.evaluate(el=>el.scrollTop=0);await waitMeasured();await screenshot('preview-v7-works')

  const tabSpacing=await categories.evaluate(el=>{const r=el.getBoundingClientRect(),c=document.querySelector('.create-actions').getBoundingClientRect(),t=document.querySelector('.tree-scroll').getBoundingClientRect(),s=getComputedStyle(el);return {marginTop:s.marginTop,marginBottom:s.marginBottom,above:r.top-c.bottom,below:t.top-r.bottom,height:r.height}})
  assert.equal(tabSpacing.marginTop,'16px');assert.equal(tabSpacing.marginBottom,'12px');assert.equal(tabSpacing.above,16);assert.equal(tabSpacing.below,12);assert.equal(tabSpacing.height,36)
  check('v7 neutral Tab group retains room above and below: 16px top / 12px bottom without increasing option height',tabSpacing)
  await chooseCategory('角色');await page.getByLabel('内容',{exact:true}).selectOption('normal');await page.getByLabel('栏宽',{exact:true}).selectOption('200');await waitMeasured()
  const roleGeometry=await panel.locator('[data-kind="character"]').evaluateAll(els=>els.map(el=>{const name=el.querySelector('.nav-label'),tag=el.querySelector('.role-tag'),button=el.querySelector('.row-main'),nr=name.getBoundingClientRect(),tr=tag.getBoundingClientRect(),br=button.getBoundingClientRect();return {name:name.textContent,tag:tag.textContent,gap:tr.left-nr.right,rightSpace:br.right-tr.right,within:tr.right<=br.right,accessibleName:button.getAttribute('aria-label'),identity:tag.getAttribute('aria-label')}}))
  assert.equal(roleGeometry.length,10);for(const row of roleGeometry){assert.ok(Math.abs(row.gap-6)<.1);assert.ok(row.within&&row.rightSpace>16);assert.ok(row.accessibleName.includes(row.name)&&row.accessibleName.includes(row.identity))}
  await screenshot('preview-role-badges');check('Short role badges follow the name by 6px on the left, preserve full accessible identity and no longer align to the row end', {roles:roleGeometry})
  await page.getByLabel('内容',{exact:true}).selectOption('long');await waitMeasured();assert.equal(await page.getByTestId('label-character').getAttribute('data-overflow'),'true')
  const longRole=await panel.locator('[data-node="character"]').evaluate(el=>{const n=el.querySelector('.nav-label').getBoundingClientRect(),t=el.querySelector('.role-tag').getBoundingClientRect();return {gap:t.left-n.right,tagWidth:t.width,tagMask:getComputedStyle(el.querySelector('.role-tag')).maskImage}})
  assert.ok(Math.abs(longRole.gap-6)<.1&&longRole.tagWidth>0);assert.equal(longRole.tagMask,'none');check('Long role names fade before the inline fixed-width identity tag',longRole)

  const paletteResults=[]
  const readPalette=()=>sidebar.evaluate(el=>{
    const parse=value=>{if(value.startsWith('#'))return [...value.slice(1).match(/../g).map(v=>parseInt(v,16)/255),1];if(value.startsWith('color(srgb')){const [channels,alpha='1']=value.slice(11,-1).split('/');return [...channels.trim().split(/\s+/).map(Number),Number(alpha)]}const values=value.match(/[\d.]+/g).map(Number);return [values[0]/255,values[1]/255,values[2]/255,values[3]??1]}
    const blend=(foreground,background)=>foreground.slice(0,3).map((v,i)=>v*foreground[3]+background[i]*(1-foreground[3]))
    const luminance=color=>color.slice(0,3).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
    const root=getComputedStyle(document.documentElement),base=parse(getComputedStyle(el).backgroundColor)
    return Array.from(el.querySelectorAll('.tree-row[data-icon-tone]')).map(row=>{const s=getComputedStyle(row),icon=row.querySelector('.row-main>svg,.character-letter'),tag=row.querySelector('.role-tag'),is=getComputedStyle(icon),tone=row.dataset.iconTone,expected=parse(root.getPropertyValue(`--icon-${tone}`).trim()),actual=parse(is.color),background=blend(parse(s.backgroundColor),base),badge=tag?getComputedStyle(tag):null;return {node:row.dataset.node,kind:row.dataset.kind,role:row.dataset.role??null,tone,active:row.classList.contains('active'),color:is.color,expected:expected.slice(0,3),actual:actual.slice(0,3),iconContrast:contrast(actual,background),tagColor:badge?.color??null,badgeContrast:badge?contrast(parse(badge.color),blend(parse(badge.backgroundColor),background)):null,shape:icon.dataset.navIcon??icon.className,fullIdentity:row.querySelector('.row-main').getAttribute('aria-label')}})
  })
  for(const theme of ['宣纸','玄墨']){await page.getByRole('button',{name:theme,exact:true}).click();await page.getByLabel('内容',{exact:true}).selectOption('normal');await chooseCategory('作品');await waitMeasured();const types=await readPalette();assert.ok(new Set(types.map(row=>row.tone)).size>=20);for(const row of types){assert.deepEqual(row.actual,row.expected);assert.ok(row.iconContrast>=3,`${theme} ${row.node} contrast ${row.iconContrast}`)}const typeColors=new Map(types.map(row=>[row.tone,row.color]));assert.equal(new Set(typeColors.values()).size,typeColors.size)
    await chooseCategory('角色');await waitMeasured();const roles=await readPalette();assert.equal(roles.length,10);for(const row of roles){assert.equal(row.color,row.tagColor);assert.ok(row.badgeContrast>=4.5,`${theme} ${row.node} badge contrast ${row.badgeContrast}`)}assert.equal(new Set(roles.map(row=>row.color)).size,4)
    const activeRoles=[];for(const id of ['character','support1','antagonist','mystery']){await panel.locator(`[data-node="${id}"] .row-main`).click();const row=(await readPalette()).find(row=>row.node===id);assert.equal(row.active,true);assert.equal(row.color,row.tagColor);assert.deepEqual(row.actual,row.expected);assert.ok(row.badgeContrast>=4.5,`${theme} selected ${id} contrast ${row.badgeContrast}`);activeRoles.push(row)}
    assert.equal(await panel.locator('.character-letter').count(),2);assert.equal(await panel.locator('.character-letter').first().innerText(),'渡');await screenshot(`preview-v7-palette-${theme==='宣纸'?'paper':'ink'}`);paletteResults.push({theme,types,roles,activeRoles})
  }
  check('Theme-specific navigation icon tokens stay distinct and readable; all main row icons match their type token, while all 10 role glyphs and badges share four identity colors',{themes:paletteResults,minIconContrast:Math.min(...paletteResults.flatMap(theme=>theme.types.map(row=>row.iconContrast))),minBadgeContrast:Math.min(...paletteResults.flatMap(theme=>[...theme.roles,...theme.activeRoles].map(row=>row.badgeContrast)))})
  check('Role colors survive selection; foreshadow letter avatar is preserved and toned with its badge, rather than recoloring a hidden fallback icon')
  await page.getByLabel('内容',{exact:true}).selectOption('long');await waitMeasured()

  await page.evaluate(()=>{
    window.__drawerRead=()=>{
      const frame=document.querySelector('.drawer-demo'),body=document.querySelector('.drawer-body'),viewport=document.querySelector('.drawer-viewport'),br=body.getBoundingClientRect(),vr=viewport.getBoundingClientRect(),transform=getComputedStyle(body).transform,matrix=transform==='none'?new DOMMatrixReadOnly():new DOMMatrixReadOnly(transform),round=value=>Math.round(value*1000)/1000
      const layout=Array.from(body.querySelectorAll('.create-action,.nav-tabs,.nav-tab,.tree-row,.nav-label,.role-tag,.nav-group-heading,.account-footer,.account-button,.avatar,.row-main>svg,.character-letter,.unavailable-work p,.category-error p')).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {key:el.getAttribute('data-node')??el.getAttribute('data-testid')??el.className,text:el.textContent,x:round(r.left-br.left),y:round(r.top-br.top),width:round(r.width),height:round(r.height),fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,borderColor:s.borderColor,iconName:el.dataset.navIcon??null,whiteSpace:s.whiteSpace,overflow:el.dataset.overflow??null,mask:s.maskImage}})
      return {width:br.width,height:br.height,visible:vr.width,tx:matrix.m41,scaleX:matrix.m11,scaleY:matrix.m22,progress:Number(frame.dataset.progress),moving:frame.dataset.moving==='true',target:frame.dataset.target,inert:body.inert,layout,view:document.querySelector('.tree-scroll').dataset.view,scroll:document.querySelector('.tree-scroll').scrollTop}
    }
  })
  const frames={scope:'Synthetic HTML drawer animation frames only, not actual Electron/native hit-testing or real DashboardShell layout compositor.',revision:'v7',cases:[]}
  const settled=()=>page.waitForFunction(()=>document.querySelector('.drawer-demo').dataset.moving==='false')
  const record=()=>page.evaluate(async()=>{const samples=[window.__drawerRead()];let started=false;for(let count=0;count<220;count++){await new Promise(requestAnimationFrame);const sample=window.__drawerRead();samples.push(sample);if(sample.moving)started=true;if(started&&!sample.moving)break}return samples})
  const verifyFrames=(samples,baseline,label)=>{
    assert.ok(samples.length>4,label)
    let maxGeometryDelta=0
    for(const sample of samples){for(const field of ['width','height']){const delta=Math.abs(sample[field]-baseline[field]);maxGeometryDelta=Math.max(maxGeometryDelta,delta);assert.ok(delta<.05,`${label} drawer ${field}: ${sample[field]} vs ${baseline[field]}`)}assert.equal(sample.layout.length,baseline.layout.length,label);for(let index=0;index<sample.layout.length;index++){const current=sample.layout[index],expected=baseline.layout[index],{x,y,width,height,...rest}=current,{x:ex,y:ey,width:ew,height:eh,...expectedRest}=expected;assert.deepEqual(rest,expectedRest,`${label} ${current.key} styles/text`);for(const field of ['x','y','width','height']){const delta=Math.abs(current[field]-expected[field]);maxGeometryDelta=Math.max(maxGeometryDelta,delta);assert.ok(delta<.05,`${label} ${current.key} ${field}: ${current[field]} vs ${expected[field]}`)}}assert.equal(sample.scaleX,1,label);assert.equal(sample.scaleY,1,label);assert.ok(Math.abs(sample.tx-(sample.visible-baseline.width))<.15,label);assert.equal(sample.view,baseline.view);assert.equal(sample.scroll,baseline.scroll);if(sample.moving)assert.equal(sample.inert,true)}
    frames.cases.push({label,width:baseline.width,verifiedFrames:samples.length,maxGeometryDelta,geometryTolerancePx:.05,baselineLayout:baseline.layout,samples:samples.map(({visible,tx,progress,moving,target,inert})=>({visible,tx,progress,moving,target,inert}))})
  }
  await page.getByLabel('栏宽',{exact:true}).selectOption('260');await page.getByLabel('慢速动画预览',{exact:true}).check();await waitMeasured();const initial=await page.evaluate(()=>window.__drawerRead()),closing=record()
  await sidebar.getByRole('button',{name:'收起左侧导航栏',exact:true}).click();await page.waitForFunction(()=>{const p=Number(document.querySelector('.drawer-demo').dataset.progress);return p>.2&&p<.65});await screenshot('preview-drawer-mid')
  const closeFrames=await closing;verifyFrames(closeFrames,initial,'slow-close');assert.equal(closeFrames.at(-1).visible,0);await focusIs('.drawer-toggle');assert.equal(await sidebar.count(),0);await screenshot('preview-drawer-closed')
  const opening=record();await page.getByRole('button',{name:'展开左侧导航栏',exact:true}).click();const openFrames=await opening;verifyFrames(openFrames,initial,'slow-open');await settled();await focusIs('[aria-label="收起左侧导航栏"]');assert.equal(openFrames.at(-1).width,openFrames.at(-1).visible)
  await page.getByLabel('慢速动画预览',{exact:true}).uncheck();check('Actual close/open clicks translate and clip a fixed-width sidebar; every sampled row/name/tag/Tab/footer keeps geometry, fonts, lines and fade; hidden focus leaves navigation', {closeFrames:closeFrames.length,openFrames:openFrames.length,width:initial.width})
  for(const theme of ['宣纸','玄墨']){await page.getByRole('button',{name:theme,exact:true}).click();for(const width of ['200','260','420']){await page.getByLabel('栏宽',{exact:true}).selectOption(width);await waitMeasured();const baseline=await page.evaluate(()=>window.__drawerRead()),out=record();await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();verifyFrames(await out,baseline,`${theme}-${width}-close`);const incoming=record();await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();verifyFrames(await incoming,baseline,`${theme}-${width}-open`);await settled()}}
  check('Drawer fixed-shape animation verified in both themes and 200/260/420px, including all inline role badges and long-name masks', {cases:12})
  const reverseRecord=record();await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();await page.waitForFunction(()=>{const f=document.querySelector('.drawer-demo'),p=Number(f.dataset.progress);return f.dataset.moving==='true'&&p>.25&&p<.8})
  const reverseBoundary=await page.evaluate(()=>{const before=window.__drawerRead();document.querySelector('.drawer-toggle').click();const after=window.__drawerRead();return {before:before.tx,after:after.tx,width:before.width}})
  assert.equal(reverseBoundary.before,reverseBoundary.after);const reversal=await reverseRecord;verifyFrames(reversal,reversal[0],'mid-animation-reverse');assert.equal(reversal.at(-1).target,'open');assert.equal(reversal.at(-1).progress,1)
  check('Mid-animation reversal starts at the same position and returns to the exact open endpoint without squeezing or remounting',reverseBoundary)
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();await settled();assert.equal(await page.locator('.drawer-demo').getAttribute('data-progress'),'0');await page.getByRole('button',{name:'展开左侧导航栏',exact:true}).click();await settled();assert.equal(await page.locator('.drawer-demo').getAttribute('data-progress'),'1');await page.emulateMedia({reducedMotion:'no-preference'})
  check('Reduced-motion preference switches directly between complete closed/open endpoints')
  await page.getByLabel('内容',{exact:true}).selectOption('long');await chooseCategory('作品');await waitMeasured();const textLayout=await page.evaluate(()=>window.__drawerRead()),errorClosing=record();await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();verifyFrames(await errorClosing,textLayout,'multiline-error-help-close');const errorOpening=record();await page.getByRole('button',{name:'切换导航抽屉',exact:true}).click();verifyFrames(await errorOpening,textLayout,'multiline-error-help-open')
  check('Existing multiline unavailable-work help and nested works retain identical line-box geometry while the drawer moves')
  await writeFile(join(directory,'drawer-frames.json'),JSON.stringify(frames,null,2)+'\n')
  await page.getByLabel('栏宽',{exact:true}).selectOption('260');await chooseCategory('角色');await page.getByLabel('内容',{exact:true}).selectOption('normal');await waitMeasured();await screenshot('preview-v7-final')
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.httpRequests,[]);assert.deepEqual(await hashes(),before)
  check('No browser errors or HTTP requests; all inspected production source hashes unchanged')
  report.status='passed'
}catch(error){report.status='failed';report.failure=error.stack;await screenshot('preview-failure').catch(()=>{});throw error}
finally{await writeFile(join(directory,'preview-checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({scope:'sidebar-html-only',status:report.status,checks:report.checks.length,pageErrors:report.pageErrors,httpRequests:report.httpRequests}))}
