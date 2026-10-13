// Isolated Chromium capability research, no product or user data.
import {chromium} from 'playwright'
import {mkdir,writeFile} from 'node:fs/promises'
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage(),results=[]
try {
 for(const type of ['text','email','number','date','datetime-local','month','week','time','password']) {
  await page.setContent(`<input id="field" type="${type}">`)
  const field=page.locator('#field'),value={email:'writer@example.invalid',number:'12345',date:'2026-10-13','datetime-local':'2026-10-13T10:30',month:'2026-10',week:'2026-W42',time:'10:30',password:'synthetic-fixture'}[type]??'Synthetic text'
  await field.fill(value);await field.focus();await page.keyboard.press('Control+a')
  results.push(await field.evaluate(el=>({type:el.type,selectionStart:el.selectionStart,selectionEnd:el.selectionEnd,visibleSelection:el.type==='password'?'[masked]':window.getSelection()?.toString(),copy:document.queryCommandEnabled('copy'),cut:document.queryCommandEnabled('cut'),selectAll:document.queryCommandEnabled('selectAll'),undo:document.queryCommandEnabled('undo')})))
 }
 await mkdir('docs/evidence/text-context-menu',{recursive:true})
 await writeFile('docs/evidence/text-context-menu/control-inspection.json',JSON.stringify({scope:'Synthetic Chrome control selection capability only, not Electron/native acceptance',results},null,2)+'\n')
 console.log(JSON.stringify(results))
}finally{await browser.close()}
