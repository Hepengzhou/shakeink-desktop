import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {chromium,type Browser,type Page} from 'playwright-core'
import {expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
const bundle=build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {SettingsDialog} from './src/components/desktop/SettingsDialog';import {OnboardingController} from './src/components/desktop/OnboardingController';
import {useDesktopStore} from './src/stores/desktop';import {defaultState} from './desktop/core/settings';
const root=createRoot(document.getElementById('app'));globalThis.calls=0;globalThis.exits=0;globalThis.commits=0;globalThis.fail=false;globalThis.pending=false;
window.desktop={openProjectRepository:async()=>{globalThis.calls++;if(globalThis.pending)await new Promise(resolve=>globalThis.release=resolve);if(globalThis.fail)throw Error('fixture');},onboarding:async()=>{globalThis.commits++;throw Error('No welcome commit expected');}};
globalThis.mount=(surface,step='welcome')=>{useDesktopStore.setState({bootstrap:{...structuredClone(defaultState),platform:'win32',version:'0.10-alpha',dataRoot:'isolated',systemDark:false,onboarding:{version:1,completed:step==='welcome',step,textModelId:null,imageModelId:null,receipt:null}}});flushSync(()=>root.render(surface==='settings'?<SettingsDialog open initialSection='about' onOpenChange={()=>{}}/>:<OnboardingController key={step} request='full' suspended={false} onExit={()=>globalThis.exits++} finalFocus={()=>null}/>));};
globalThis.dispose=()=>flushSync(()=>root.unmount());
`},bundle:true,write:false,platform:'browser',format:'iife',tsconfig:'tsconfig.json'})
let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,...(process.env.SHAKEINK_TEST_CHROMIUM?{executablePath:process.env.SHAKEINK_TEST_CHROMIUM}:{})})})
test.after(async()=>{await browser?.close()})
async function scenario(run:(page:Page)=>Promise<void>){
 const page=await browser.newPage();page.setDefaultTimeout(5000)
 await page.route('**/*',route=>route.abort())
 await page.setContent(`<style>:root{--card:white;--foreground:#342b23;--border:#ddd;--primary:#8b5d26;--muted-foreground:#756959;--ring:#8b5d26;--sidebar:#f5f0e4}[data-slot="dialog-overlay"]{position:fixed;inset:0;z-index:50}[data-slot="dialog-content"]{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:51;background:white}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}button{padding:8px;cursor:pointer}svg{width:16px;height:16px}${await readFile('src/app/desktop.css','utf8')}</style><div id="app"></div>`)
 await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:(await bundle).outputFiles[0].text})
 try{await run(page)}finally{await page.evaluate(()=>(window as any).dispose());await page.close()}
}
test('VS-02/04: Settings final row is highlighted and keyboard opens only once while pending',async()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).mount('settings'))
 const dialog=page.getByRole('dialog',{name:'设置',exact:true}),cta=dialog.getByRole('button',{name:'去 GitHub 点亮 Star',exact:true})
 await expect(cta).toBeVisible();await expect(dialog).toContainText('0.10-alpha')
 assert.match(await dialog.locator('.desktop-settings-group > div > :last-child').getAttribute('class')??'',/desktop-project-star-settings/)
 await expect(dialog.getByRole('button',{name:'填写反馈',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'查看文档',exact:true})).toBeEnabled()
 await expect(dialog.getByRole('button',{name:'访问官网',exact:true})).toBeEnabled();await expect(dialog.getByRole('button',{name:'查看常见问题',exact:true})).toBeEnabled()
 await page.evaluate(()=>(window as any).pending=true);await cta.focus();await page.keyboard.press('Enter')
 await expect(cta).toBeDisabled();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>(window as any).calls),1)
 await page.evaluate(()=>(window as any).release());await expect(cta).toBeEnabled()
}))
test('VS-03/04: Welcome optional Star can fail and retry; start still exits without a commit',async()=>scenario(async page=>{
 await page.evaluate(()=>{(window as any).mount('welcome');(window as any).fail=true})
 const dialog=page.getByRole('dialog',{name:'欢迎使用',exact:true}),cta=dialog.getByRole('button',{name:'给玄印一颗 Star',exact:true})
 await expect(cta).toBeVisible();await cta.click();await expect(dialog.getByRole('alert')).toContainText('无法打开浏览器')
 assert.equal(await page.evaluate(()=>(window as any).exits),0);assert.equal(await page.evaluate(()=>(window as any).commits),0)
 await page.evaluate(()=>(window as any).fail=false);await cta.focus();await page.keyboard.press('Space')
 await expect(dialog.getByRole('alert')).toHaveCount(0);assert.equal(await page.evaluate(()=>(window as any).calls),2)
 await dialog.getByRole('button',{name:'开始创作',exact:true}).click();assert.equal(await page.evaluate(()=>(window as any).exits),1)
 assert.equal(await page.evaluate(()=>(window as any).commits),0)
}))
test('VS-03: no Star prompt before full onboarding completes',async()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).mount('welcome','theme'))
 await expect(page.getByRole('dialog',{name:'选择主题',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'给玄印一颗 Star',exact:true})).toHaveCount(0)
 assert.equal(await page.evaluate(()=>(window as any).calls),0)
}))
