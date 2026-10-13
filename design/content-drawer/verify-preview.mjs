// Synthetic offline HTML design QA. This does not test the installed product.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory=resolve('design/content-drawer');
const sources=['src/components/layout/DashboardShell.tsx','src/components/layout/useSidebarDrawer.ts','src/components/layout/ContentTabs.tsx','src/app/desktop.css'];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const report={scope:'Offline synthetic HTML design only; not real React product, Electron, Monaco, macOS or installed package acceptance.',status:'running',cases:[],checks:[],pageErrors:[],httpRequests:[],sourceHashesBefore:await hashes()};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1060}});
page.on('pageerror',error=>report.pageErrors.push(error.message));page.on('request',req=>{if(/^https?:/.test(req.url()))report.httpRequests.push(req.url());});
await page.route(/^https?:/,route=>route.abort());
const sample=()=>page.evaluate(()=>{
 const inner=document.getElementById('content-inner'),view=document.getElementById('content-viewport'),r=inner.getBoundingClientRect();
 const geometry=[...inner.querySelectorAll('[data-fixed-geometry],.content-caption,textarea,input,.content-tools')].filter(el=>el.getClientRects().length).map(el=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,line:s.lineHeight};});
 const lines=[...inner.querySelectorAll('[data-lines]')].filter(el=>el.getClientRects().length).map(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()].map(b=>({x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height}));});
 const matrix=new DOMMatrix(getComputedStyle(inner).transform);
 return {w:r.width,v:view.getBoundingClientRect().width,translate:matrix.m41,scale:[matrix.a,matrix.d],inert:inner.inert,phase:document.getElementById('workspace').dataset.contentPhase,geometry,lines};
});
const compare=(a,b)=>{
 assert(Math.abs(a.w-b.w)<.05,'Fixed inner width changed');assert.deepEqual(a.scale,[1,1]);
 assert(Math.abs(a.translate-(a.w-a.v))<.05,'Right-anchor translation mismatch');
 assert.equal(a.geometry.length,b.geometry.length);assert.equal(a.lines.length,b.lines.length);
 for(const [i,g] of a.geometry.entries())for(const key of ['x','y','w','h'])assert(Math.abs(g[key]-b.geometry[i][key])<.05,`Geometry ${i}.${key} changed`);
 for(const [i,line] of a.lines.entries()){assert.equal(line.length,b.lines[i].length,'Text line count changed');for(const [j,g]of line.entries())for(const key of ['x','y','w','h'])assert(Math.abs(g[key]-b.lines[i][j][key])<.05,`Line ${i}.${j}.${key} changed`);}
};
const collect=async action=>{
 await page.evaluate(()=>{window.designFrames=[];window.recordDesign=true;const loop=()=>{const d=window.contentDrawerDesign.read(),el=document.getElementById('content-inner'),r=el.getBoundingClientRect();if(d.right.moving){const list=[...el.querySelectorAll('[data-lines]')].filter(p=>p.getClientRects().length).map(p=>{const range=document.createRange();range.selectNodeContents(p);return [...range.getClientRects()].map(b=>({x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height}));});const geometry=[...el.querySelectorAll('[data-fixed-geometry],.content-caption,textarea,input,.content-tools')].filter(e=>e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,line:s.lineHeight};});const m=new DOMMatrix(getComputedStyle(el).transform);window.designFrames.push({w:r.width,v:document.getElementById('content-viewport').getBoundingClientRect().width,translate:m.m41,scale:[m.a,m.d],geometry,lines:list});}if(window.recordDesign)requestAnimationFrame(loop);};requestAnimationFrame(loop);});
 await action();await page.waitForFunction(()=>!window.contentDrawerDesign.read().right.moving);await page.evaluate(()=>window.recordDesign=false);
 return page.evaluate(()=>window.designFrames);
};
try{
 await page.goto(pathToFileURL(resolve(directory,'index.html')).href);await page.evaluate(()=>document.fonts.ready);
 report.node=process.version;report.browser=await browser.version();
 await page.screenshot({path:resolve(directory,'preview-ink.png'),fullPage:true});
 for(const theme of ['ink','paper'])for(const mode of ['manuscript','form'])for(const width of ['360','500']){
  await page.locator(`[data-theme-choice=${theme}]`).click();await page.locator('#body-mode').selectOption(mode);await page.locator('#content-width').selectOption(width);await page.waitForTimeout(30);
  const initial=await sample();
  for(const open of [false,true]){
   const frames=await collect(()=>page.locator('#external-content').click());assert(frames.length>2);
   for(const f of frames)compare(f,initial);
   const settled=await sample();assert.equal(settled.v,open?settled.w:0);if(open)compare(settled,initial);
   report.cases.push({theme,mode,width,action:open?'open':'close',sampledFrames:frames.length,innerWidth:initial.w,lineCounts:initial.lines.map(l=>l.length),maxWidthDelta:Math.max(...frames.map(f=>Math.abs(f.w-initial.w))),frames});
  }
 }
 report.checks.push('16 motion cases: two themes × two bodies × two widths × close/open, frame width and line rectangles invariant');
 await page.locator('#body-mode').selectOption('manuscript');await page.locator('#content-width').selectOption('500');
 await page.locator('#draft').fill('保留的合成草稿');await page.locator('#content-scroll').evaluate(el=>el.scrollTop=170);const scroll=await page.locator('#content-scroll').evaluate(el=>el.scrollTop);
 const reversalInitial=await sample();const reversalFrames=await collect(async()=>{await page.evaluate(()=>{window.contentDrawerDesign.toggleRight();setTimeout(()=>window.contentDrawerDesign.toggleRight(),90);setTimeout(()=>window.contentDrawerDesign.toggleRight(),180);setTimeout(()=>window.contentDrawerDesign.toggleRight(),270);});await page.waitForTimeout(300);});for(const frame of reversalFrames)compare(frame,reversalInitial);
 assert.equal(await page.locator('#draft').inputValue(),'保留的合成草稿');assert.equal(await page.locator('#content-scroll').evaluate(el=>el.scrollTop),scroll);
 report.checks.push('Repeated reversal keeps synthetic draft and scroll');
 await page.locator('#content-scroll').evaluate(el=>el.scrollTop=0);
 await page.locator('#slow').check();await page.locator('#external-content').click();await page.waitForTimeout(120);const beforeReverse=await sample();
 await page.evaluate(()=>window.contentDrawerDesign.toggleRight());const afterReverse=await sample();assert(Math.abs(beforeReverse.v-afterReverse.v)<20);compare(afterReverse,{...beforeReverse,v:afterReverse.v,translate:afterReverse.translate});await page.waitForFunction(()=>!window.contentDrawerDesign.read().right.moving);
 report.checks.push('Slow motion and mid-motion reversal preserve full relative geometry');await page.locator('#slow').uncheck();
 await page.locator('#progress').fill('50');const mid=await sample();assert.equal(mid.v,250);assert.equal(mid.w,500);assert.equal(mid.inert,true);await page.screenshot({path:resolve(directory,'preview-mid-paper.png'),fullPage:true});
 await page.locator('#progress').fill('100');
 await page.locator('[data-theme-choice=ink]').click();await page.screenshot({path:resolve(directory,'preview-ink.png'),fullPage:true});await page.locator('[data-theme-choice=paper]').click();await page.screenshot({path:resolve(directory,'preview-paper.png'),fullPage:true});
 await page.locator('#body-mode').selectOption('form');await page.screenshot({path:resolve(directory,'preview-form-paper.png'),fullPage:true});
 report.checks.push('50% freeze is inert and fixed at 500px; open screenshots captured');
 await page.locator('#body-mode').selectOption('manuscript');await page.locator('#fullscreen').click();const full=await sample();assert(full.w>900);await collect(()=>page.locator('#external-content').click());await page.locator('#external-content').click();await page.waitForFunction(()=>!window.contentDrawerDesign.read().right.moving);report.checks.push('Fullscreen content closes at its full starting width');
 await page.locator('#window-width').selectOption('700');const narrow=await sample();assert.equal(narrow.w,698);await collect(()=>page.locator('#external-content').click());await collect(()=>page.locator('#external-content').click());await page.screenshot({path:resolve(directory,'preview-narrow.png'),fullPage:true});report.checks.push('700px window uses a full-width right overlay');
 await page.locator('#window-width').selectOption('1280');await page.locator('#slow').check();await page.locator('#external-content').click();await page.waitForTimeout(100);const frozen=await sample();await page.locator('#window-width').selectOption('700');const crossed=await sample();assert(Math.abs(crossed.w-frozen.w)<.05);assert.equal(await page.locator('#workspace').getAttribute('data-mode'),'wide');await page.waitForFunction(()=>!window.contentDrawerDesign.read().right.moving);assert.equal(await page.locator('#workspace').getAttribute('data-mode'),'narrow');report.checks.push('Resize across 900px freezes width and mode through motion, reconciles at completion');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#external-content').click();const reduced=await sample();assert.equal(reduced.phase,'open');assert.equal(reduced.v,reduced.w);report.checks.push('Reduced motion lands immediately without squeezed intermediate geometry');
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.httpRequests,[]);report.sourceHashesAfter=await hashes();assert.deepEqual(report.sourceHashesAfter,report.sourceHashesBefore);report.checks.push('No page errors or HTTP requests; production source hashes unchanged');report.status='passed-design-only';
}catch(error){report.status='failed-design-check';report.error=String(error);throw error;}finally{await writeFile(resolve(directory,'preview-checks.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,sampledFrames:report.cases.reduce((n,c)=>n+c.sampledFrames,0),checks:report.checks}));
