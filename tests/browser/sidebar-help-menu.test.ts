import assert from 'node:assert/strict'
import {test} from 'node:test'
import {chromium,type Browser} from 'playwright-core'
import {withSidebar} from '../helpers/sidebar-navigation-fixture'
let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,...(process.env.SHAKEINK_TEST_CHROMIUM?{executablePath:process.env.SHAKEINK_TEST_CHROMIUM}:{})})})
test.after(async()=>{await browser?.close()})

test('SH-B-01 account menu lists settings, help submenu links and feedback; each opens its desktop command',()=>withSidebar(browser,{},async page=>{
 await page.evaluate(()=>{const calls:string[]=[];(window as any).helpMenuCalls=calls;(window as any).desktop={command:(id:string)=>{calls.push(id);return Promise.resolve()}}})
 const calls=()=>page.evaluate(()=>(window as any).helpMenuCalls as string[])
 const account=page.getByRole('button',{name:'账号菜单：隔离用户 sidebar@example.invalid',exact:true})
 const help=()=>page.getByRole('menuitem',{name:'帮助',exact:true})
 const openHelp=async()=>{await account.click();await help().waitFor();await help().hover();await page.getByRole('menuitem',{name:'官网',exact:true}).waitFor()}

 await account.click()
 await page.getByRole('menuitem',{name:'设置',exact:true}).waitFor()
 const top=page.locator('[data-slot="dropdown-menu-content"]').getByRole('menuitem')
 assert.deepEqual(await top.allTextContents(),['设置','帮助','问题反馈'])
 await help().hover()
 await page.getByRole('menuitem',{name:'官网',exact:true}).waitFor()
 const sub=page.locator('[data-slot="dropdown-menu-sub-content"]').getByRole('menuitem')
 assert.deepEqual(await sub.allTextContents(),['官网','产品介绍','用户指南','常见问题'])
 await page.getByRole('menuitem',{name:'官网',exact:true}).click()
 await page.getByRole('menuitem',{name:'官网',exact:true}).waitFor({state:'detached'})
 assert.deepEqual(await calls(),['help.website'])

 const expected=['help.website']
 for(const [name,id] of [['产品介绍','help.docs'],['用户指南','help.guide'],['常见问题','help.faq']] as const){
  await openHelp()
  const item=page.getByRole('menuitem',{name,exact:true})
  await item.click();await item.waitFor({state:'detached'})
  expected.push(id)
  assert.deepEqual(await calls(),[...expected])
 }

 await account.click()
 const feedback=page.getByRole('menuitem',{name:'问题反馈',exact:true})
 await feedback.waitFor();await feedback.click();await feedback.waitFor({state:'detached'})
 assert.deepEqual(await calls(),['help.website','help.docs','help.guide','help.faq','help.feedback'])
}))
