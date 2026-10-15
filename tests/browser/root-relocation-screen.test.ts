import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {build} from 'esbuild'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import {chromium,type Browser,type Page} from 'playwright-core'
import type {RootRelocationState} from '../../desktop/shared/root-relocation'
import {onboardingStartup} from '../../src/lib/desktop/onboarding-flow'
import {defaultState} from '../../desktop/core/settings'
import type {StateSnapshot} from '../../desktop/shared/ipc'

// Actual installed React/BaseUI/semantic CSS. Restricted bridge is controlled;
// no native app, source database, filesystem picker or network is opened.
const stylesheet=(async()=>{const path=resolve('src/app/globals.css');return (await postcss([tailwindcss()]).process(await readFile(path,'utf8'),{from:path})).css+'\n'+await readFile('src/app/desktop.css','utf8')})()
const bundle=build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {RootRelocationScreen} from './src/components/desktop/RootRelocationScreen';
globalThis.mountRelocation=(initial,options={})=>{
 const listeners=new Set(),past=[],calls=[],commands=[],pending=new Map();let resolveState;
 const first=new Promise(resolve=>resolveState=resolve);
 window.desktop={command:()=>{throw Error('workbench bridge forbidden')}};
 if(options.missing)delete window.desktopRootRelocation;else window.desktopRootRelocation={
 subscribe:listener=>{calls.push('subscribe');listeners.add(listener);past.push(listener);if(options.event)listener(options.event);return()=>{calls.push('unsubscribe');listeners.delete(listener)}},
 state:()=>{calls.push('state');return options.hold?first:Promise.resolve(initial)},
 command:command=>{commands.push(command);return new Promise((yes,no)=>pending.set(command,{yes,no}))},
 };
 const root=createRoot(document.getElementById('app'));flushSync(()=>root.render(React.createElement(RootRelocationScreen)));
 return{calls,commands,emit:state=>flushSync(()=>listeners.forEach(listener=>listener(state))),late:state=>flushSync(()=>past.forEach(listener=>listener(state))),
 resolveState,resolve:command=>pending.get(command).yes(),reject:command=>pending.get(command).no(Error('private Key /Users/private/root')),
 unmount:()=>flushSync(()=>root.unmount())};
};`},bundle:true,platform:'browser',format:'iife',write:false,tsconfig:'tsconfig.json',plugins:process.env.ROOT_RELOCATION_MENU_BASELINE?[{name:'menu-baseline',setup(api){api.onLoad({filter:/RootRelocationScreen\.tsx$/},async()=>({contents:await readFile('docs/evidence/implementation-33/root-relocation-screen-before-menu.tsx.txt','utf8'),loader:'tsx',resolveDir:resolve('src/components/desktop')}))}}]:[]}).then(result=>result.outputFiles[0].text)
let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,...process.env.SHAKEINK_TEST_CHROMIUM?{executablePath:process.env.SHAKEINK_TEST_CHROMIUM}:{}})})
test.after(async()=>{await browser?.close()})
const initial:RootRelocationState={version:1,revision:1,phase:'unavailable',theme:'paper',sourcePath:'/旧目录/玄印写作',targetPath:null,notice:'root-unavailable',unreadResultCount:null,canChoose:true,canCancel:false,canRestart:false,canReset:false,defaultPath:null}
async function scenario(run:(page:Page)=>Promise<void>){const page=await browser.newPage({viewport:{width:680,height:560}}),errors:string[]=[];page.setDefaultTimeout(1500);page.on('pageerror',e=>errors.push(e.message));try{await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:'<div id="app"></div>'}):route.abort());await page.goto('http://127.0.0.1:1/relocation');await page.addStyleTag({content:await stylesheet});await page.addScriptTag({content:await bundle});await run(page);assert.deepEqual(errors,[])}finally{await page.close()}}
async function mount(page:Page,state=initial,options:Record<string,unknown>={}){await page.evaluate(({state,options})=>{(window as any).f=(window as any).mountRelocation(state,options)},{state,options})}
async function emit(page:Page,state:Partial<RootRelocationState>&{revision:number}){await page.evaluate(state=>(window as any).f.emit(state),{...initial,...state})}

test('RU33-01 subscribe before snapshot, synchronous event and late/equal snapshots cannot replace current authority',async()=>scenario(async page=>{
 await mount(page,initial,{hold:true,event:{...initial,revision:6,phase:'picking',canChoose:false,canCancel:true}})
 assert.deepEqual(await page.evaluate(()=>(window as any).f.calls),['subscribe','state']);await page.getByText('正在选择目录…',{exact:true}).waitFor()
 await page.evaluate(initial=>(window as any).f.resolveState(initial),initial);await emit(page,{revision:6,phase:'complete',canRestart:true});await emit(page,{revision:5,phase:'blocked'})
 await page.getByText('正在选择目录…',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'定位原数据目录',exact:true}).count(),0)
}))
test('RU33-02 blocked pointer shows the recovery diagnosis and quit, never a picker or restart',async()=>scenario(async page=>{
 await mount(page,{...initial,phase:'blocked',notice:'pointer-invalid',canChoose:false})
 await page.getByText('数据目录中的文件丢失或损坏，无法自动修复。可以退出应用保留现状，或重置配置数据后重新开始。',{exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'定位原数据目录',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'重新打开应用',exact:true}).count(),0)
 await page.getByRole('button',{name:'退出应用',exact:true}).click();assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['quit'])
}))
test('RU33-03 choose single flight still allows cancel while native picker is physically pending',async()=>scenario(async page=>{
 await mount(page);const choose=page.getByRole('button',{name:'定位原数据目录',exact:true});await choose.waitFor()
 await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('[data-relocation-command="choose"]')!;b.click();b.click()})
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['choose'])
 await emit(page,{revision:2,phase:'picking',canChoose:false,canCancel:true});await page.getByRole('button',{name:'取消定位',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['choose','cancel']);assert.equal(await page.getByRole('button',{name:'正在取消…',exact:true}).isDisabled(),true)
 await page.getByText('正在选择目录…',{exact:true}).waitFor();await page.evaluate(()=>(window as any).f.resolve('cancel'))
 await page.getByText('正在选择目录…',{exact:true}).waitFor()
}))
test('RU33-04 safe failed request retains current phase and explicit retry without leaking cause or fake success',async()=>scenario(async page=>{
 await mount(page);await page.getByRole('button',{name:'定位原数据目录',exact:true}).click();await page.evaluate(()=>(window as any).f.reject('choose'))
 await page.getByRole('alert').filter({hasText:'操作未完成，请重试。'}).waitFor();assert.doesNotMatch(await page.locator('main').innerText(),/private|Key|Users/)
 await page.getByRole('button',{name:'定位原数据目录',exact:true}).click();assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['choose','choose'])
}))
test('RU33-05 actual native stages have no fake percentages and pending/complete preserve unread migration results',async()=>scenario(async page=>{
 await mount(page)
 for(const [index,phase]of(['picking','confirming','writing']as const).entries()){await emit(page,{revision:index+2,phase,canChoose:false,canCancel:true,targetPath:'/已找到/原数据',unreadResultCount:2});assert.equal(await page.getByRole('progressbar').count(),0);assert.doesNotMatch(await page.locator('main').innerText(),/\d+%|迁移完成/)}
 await page.getByText('保留 2 条未读迁移结果，重新打开后仍需明确确认。',{exact:true}).waitFor()
 await emit(page,{revision:5,phase:'complete',notice:null,canChoose:false,canCancel:false,canRestart:true,targetPath:'/已找到/原数据',unreadResultCount:2})
 await page.getByRole('button',{name:'重新打开应用',exact:true}).click();assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['restart']);assert.equal(await page.getByRole('button',{name:'定位原数据目录',exact:true}).count(),0)
}))
test('RU33-06 malformed/unknown or contradictory state never grants picker, preserves last valid state',async()=>scenario(async page=>{
 await mount(page,{...initial,phase:'blocked',notice:'pointer-invalid',canChoose:false})
 for(const bad of [{phase:'unknown'},{phase:'blocked',canChoose:true},{phase:'complete',canRestart:true,canChoose:true},{unreadResultCount:-1},{sourcePath:7},{sourcePath:'x'.repeat(8193)},{phase:'resetting',canReset:true},{defaultPath:'x'.repeat(8193)},{phase:'unavailable',canReset:'yes'}])await emit(page,{revision:10,...bad}as any)
 assert.equal(await page.getByRole('button',{name:'定位原数据目录',exact:true}).count(),0);await page.getByRole('alert').waitFor();await page.getByText('需要检查数据目录',{exact:true}).waitFor()
}))
test('RU33-07 unmounted connection ignores old subscriptions and late command failure',async()=>scenario(async page=>{
 await mount(page);await page.getByRole('button',{name:'定位原数据目录',exact:true}).click();await page.evaluate(()=>(window as any).f.unmount());await page.evaluate(()=>(window as any).f.reject('choose'))
 await page.evaluate(state=>(window as any).f.late(state),{...initial,revision:12,phase:'complete'});assert.equal(await page.locator('main').count(),0);assert.deepEqual(await page.evaluate(()=>(window as any).f.calls),['subscribe','state','unsubscribe'])
}))
test('RU33-08 narrow long paths use both real themes without horizontal overflow or executable markup',async()=>scenario(async page=>{
 await page.setViewportSize({width:360,height:680});await mount(page,{...initial,sourcePath:'<img onerror=alert(1)>/'+ '长路径/'.repeat(80),targetPath:'/原数据/'.repeat(90)})
 await page.getByText('原数据目录',{exact:true}).waitFor();assert.equal(await page.locator('img').count(),0)
 for(const[index,theme]of(['paper','ink']as const).entries()){await emit(page,{revision:index+2,theme,sourcePath:'<img onerror=alert(1)>/'+ '长路径/'.repeat(80),targetPath:'/原数据/'.repeat(90)});assert.equal(await page.locator('main').evaluate((el,theme)=>el.classList.contains(theme),theme),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`docs/evidence/implementation-33/root-relocation-${theme}-360.png`})}
}))
test('RU33-09 missing restricted bridge never uses workbench APIs or presents an actionable root picker',async()=>scenario(async page=>{
 await mount(page,initial,{missing:true});await page.getByRole('alert').filter({hasText:'定位状态暂不可用，请重新打开应用。'}).waitFor();assert.equal(await page.getByRole('button').count(),0)
}))
test('RU33-10 postcommit uncertainty is diagnosis plus the reset exit, cannot guess safe restart or permit new relocation',async()=>scenario(async page=>{
 await mount(page,{...initial,phase:'blocked',notice:'write-unconfirmed',canChoose:false,canCancel:false,canRestart:false,canReset:true,defaultPath:'/旧目录/默认数据'})
 await page.getByText('目录记录的持久化尚未确认，请保留所有文件并退出后重新检查。',{exact:true}).waitFor();assert.equal(await page.getByRole('button').count(),2);await page.getByRole('button',{name:'重置配置数据',exact:true}).waitFor();await page.getByRole('button',{name:'退出应用',exact:true}).waitFor()
}))
test('RU33-11 Windows menu icon precedes system controls and sends only a single fixed menu action',async()=>scenario(async page=>{
 await mount(page,{...initial,platform:'win32'});const button=page.getByRole('button',{name:'应用菜单',exact:true});await button.waitFor();assert.equal(await button.evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'no-drag');await page.evaluate(()=>{const button=document.querySelector<HTMLButtonElement>('[data-relocation-command="menu"]')!;button.click();button.click()});assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['menu']);assert.equal(await button.isDisabled(),true);await page.evaluate(()=>(window as any).f.resolve('menu'));assert.equal(await button.isDisabled(),false);await emit(page,{revision:2,platform:'darwin'});assert.equal(await page.getByRole('button',{name:'应用菜单',exact:true}).count(),0)
}))

const blockedRecovery:RootRelocationState={...initial,revision:2,phase:'blocked',notice:'pointer-invalid',sourcePath:null,canChoose:false,canCancel:false,canRestart:false,canReset:true,defaultPath:'C:\Users\作者\.shakeink'}
const resetConfirm=(revision:number,overrides:Partial<RootRelocationState>={}):Partial<RootRelocationState>&{revision:number}=>({...blockedRecovery,...overrides,revision,phase:'reset-confirm',notice:null,canChoose:false,canCancel:false,canReset:false,canRestart:false})
test('SR-B-01 blocked with reset capability shows the unrepairable dialog copy and exactly reset+quit',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('heading',{name:'无法修复数据目录',exact:true}).waitFor()
 await page.getByText('数据目录中的文件丢失或损坏，无法自动修复。可以退出应用保留现状，或重置配置数据后重新开始。',{exact:true}).waitFor()
 await page.getByText('C:\Users\作者\.shakeink',{exact:true}).waitFor()
 assert.deepEqual(await page.getByRole('button').allTextContents(),['重置配置数据','退出应用'])
}))
test('SR-B-02 blocked history-needs-recovery keeps the locate heading and old copy with the reset exit',async()=>scenario(async page=>{
 await mount(page,{...blockedRecovery,notice:'history-needs-recovery'})
 await page.getByRole('heading',{name:'定位原数据目录',exact:true}).waitFor()
 await page.getByText('历史迁移记录需要检查，请保留原目录和控制文件后联系维护者。',{exact:true}).waitFor()
 await page.getByRole('button',{name:'重置配置数据',exact:true}).waitFor()
}))
test('SR-B-03 the reset command reaches the in-place second confirmation with the default path warning',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset'])
 await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByText('此操作不可撤销',{exact:true}).waitFor()
 await page.getByText(/重置会清空数据目录（C:\Users\作者\.shakeink）的全部内容，包括收件箱、设置与模型配置、作品索引和应用备份，此操作不可撤销。/,{exact:false}).waitFor()
 await page.getByText(/作品文件保存在各自的独立目录中，不会被删除，但重置后需要重新打开关联。/).waitFor()
 assert.deepEqual(await page.getByRole('button').allTextContents(),['确认清空并重置','返回'])
}))
test('SR-B-04 a custom target source path adds the preservation line to the confirmation',async()=>scenario(async page=>{
 await mount(page,{...blockedRecovery,sourcePath:'D:\写作数据\原目录'})
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3,{sourcePath:'D:\写作数据\原目录'}))
 await page.getByText('原数据目录（D:\写作数据\原目录）的内容不会被删除或改动。',{exact:true}).waitFor()
}))
test('SR-B-05 entering reset from the history notice adds the history-cleared warning line',async()=>scenario(async page=>{
 await mount(page,{...blockedRecovery,notice:'history-needs-recovery'})
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByText('迁移与恢复历史记录也将一并清除。',{exact:true}).waitFor()
}))
test('SR-B-06 the resetting phase disables every action while the wipe runs',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByRole('button',{name:'确认清空并重置',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset','reset-confirm'])
 await emit(page,{...blockedRecovery,revision:4,phase:'resetting',notice:null,canChoose:false,canCancel:false,canReset:false,canRestart:false})
 await page.getByText('正在重置数据目录…',{exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'确认清空并重置',exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'返回',exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button').count(),2)
}))
test('SR-B-07 a successful wipe shows the completion line and keeps the manual restart fallback',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByRole('button',{name:'确认清空并重置',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset-confirm'))
 await emit(page,{...blockedRecovery,revision:4,phase:'resetting',notice:null,canChoose:false,canCancel:false,canReset:false,canRestart:false})
 await emit(page,{...blockedRecovery,revision:5,phase:'complete',notice:'reset-complete',canChoose:false,canCancel:false,canReset:false,canRestart:true})
 await page.getByText('重置完成，正在重新打开应用…',{exact:true}).waitFor()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset','reset-confirm'])
 await page.getByRole('button',{name:'重新打开应用',exact:true}).waitFor()
}))
test('SR-B-08 a failed wipe shows the retry copy and the retry button resends reset-confirm',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByRole('button',{name:'确认清空并重置',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset-confirm'))
 await emit(page,{...blockedRecovery,revision:4,phase:'reset-failed',notice:'reset-failed',canChoose:false,canCancel:false,canReset:false,canRestart:false})
 await page.getByText('重置未完成，请关闭可能占用文件的程序后重试。',{exact:true}).waitFor()
 assert.deepEqual(await page.getByRole('button').allTextContents(),['重试','退出应用'])
 await page.getByRole('button',{name:'重试',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset','reset-confirm','reset-confirm'])
}))
test('SR-B-09 unavailable and cancelled keep the locate flow with a reset exit and a working back path',async()=>scenario(async page=>{
 await mount(page,{...initial,canReset:true,defaultPath:'C:\Users\作者\.shakeink'})
 await page.getByText('若原目录已无法找回，可以重置配置数据，从默认目录重新开始。',{exact:true}).waitFor()
 assert.deepEqual(await page.getByRole('button').allTextContents(),['定位原数据目录','重置配置数据','退出应用'])
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3,{sourcePath:initial.sourcePath}))
 await page.getByRole('button',{name:'返回',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset-back'))
 await emit(page,{...initial,revision:4,phase:'cancelled',notice:null,canChoose:true,canCancel:false,canRestart:false,canReset:true,defaultPath:'C:\Users\作者\.shakeink'})
 await page.getByRole('heading',{name:'定位原数据目录',exact:true}).waitFor()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset','reset-back'])
 assert.deepEqual(await page.getByRole('button').allTextContents(),['定位原数据目录','重置配置数据','退出应用'])
}))
test('SR-B-10 a fresh root after reset reports null onboarding progress and routes to the full guide',()=>{
 const snapshot={revision:0,settings:structuredClone(defaultState.settings),models:[],onboarding:null} as StateSnapshot
 assert.deepEqual(onboardingStartup(snapshot),{flow:'full',step:'theme'})
})
test('SR-B-11 states with illegal reset fields are rejected instead of crashing the dialog',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 for(const bad of [{phase:'complete',canReset:true},{phase:'reset-confirm',canReset:true},{defaultPath:7},{defaultPath:'x'.repeat(8193)}])await emit(page,{revision:20,...bad}as any)
 await page.getByRole('alert').waitFor()
 await page.getByText('数据目录中的文件丢失或损坏，无法自动修复。可以退出应用保留现状，或重置配置数据后重新开始。',{exact:true}).waitFor()
 assert.deepEqual(await page.getByRole('button').allTextContents(),['重置配置数据','退出应用'])
}))
test('SR-B-12 a failed automatic restart keeps the reset-complete copy, dialog heading and restart fallback',async()=>scenario(async page=>{
 await mount(page,blockedRecovery)
 await page.getByRole('button',{name:'重置配置数据',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset'))
 await emit(page,resetConfirm(3))
 await page.getByRole('button',{name:'确认清空并重置',exact:true}).click();await page.evaluate(()=>(window as any).f.resolve('reset-confirm'))
 await emit(page,{...blockedRecovery,revision:4,phase:'complete',notice:'reset-complete',canChoose:false,canCancel:false,canReset:false,canRestart:true})
 await page.getByRole('heading',{name:'无法修复数据目录',exact:true}).waitFor()
 await page.getByText('重置完成，正在重新打开应用…',{exact:true}).waitFor()
 assert.equal(await page.getByText('目录记录已保存，应用将完整重新启动。',{exact:true}).count(),0,'no relocation completion copy over a reset outcome')
 await page.getByRole('button',{name:'重新打开应用',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>(window as any).f.commands),['reset','reset-confirm','restart'])
}))
