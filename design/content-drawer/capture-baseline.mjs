// Read-only production geometry probe. Real shell and ContentTabs, isolated bodies.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { withDrawer } from '../../tests/helpers/sidebar-drawer-fixture.ts';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const directory=resolve('design/content-drawer');
const report={scope:'Current real DashboardShell/ContentTabs in isolated browser fixture; synthetic paragraph injected into substituted business body. Not Electron, Monaco, database or business acceptance.',node:process.version,browser:await browser.version(),status:'running'};
try {
 await withDrawer(browser,{},async page=>{
  await page.evaluate(()=>window.drawerFixture.open());await page.waitForTimeout(800);
  await page.evaluate(()=>{const p=document.createElement('p');p.dataset.baselineParagraph='true';p.style.cssText='padding:16px;font:14px/22px sans-serif;margin:0';p.textContent='这是一段用于验证右侧内容面板收起时是否重排的合成文字。保持文字内容不变，逐帧记录完整内层宽度、段落高度和行框数量。';document.querySelector('[data-content-instance]').append(p);});
  await page.screenshot({path:resolve(directory,'baseline-open.png')});
  await page.evaluate(()=>{const start=performance.now(),frames=[];window.baselineDone=new Promise(done=>{const step=()=>{const el=document.querySelector('.content-tabs'),p=document.querySelector('[data-baseline-paragraph]');if(el){let lines=0;if(p){const range=document.createRange();range.selectNodeContents(p);lines=range.getClientRects().length;}frames.push({ms:performance.now()-start,panel:document.querySelector('#content').getBoundingClientRect().width,inner:el.getBoundingClientRect().width,paragraphHeight:p?.getBoundingClientRect().height??null,lines});}else frames.push({ms:performance.now()-start,unmounted:true});if(performance.now()-start<600)requestAnimationFrame(step);else done(frames);};step();});});
  await page.getByRole('button',{name:'显示 / 隐藏内容面板',exact:true}).click();
  await page.waitForTimeout(100);await page.screenshot({path:resolve(directory,'baseline-mid.png')});
  report.frames=await page.evaluate(()=>window.baselineDone);
  const mounted=report.frames.filter(f=>!f.unmounted);
  report.observed={firstWidth:mounted[0].inner,minWidth:Math.min(...mounted.map(f=>f.inner)),lineCounts:[...new Set(mounted.map(f=>f.lines))],paragraphHeights:[...new Set(mounted.map(f=>f.paragraphHeight))],unmountedAfterClose:report.frames.some(f=>f.unmounted)};
  assert(report.observed.minWidth<report.observed.firstWidth/2,'Current right inner must follow panel shrinking');
  assert(report.observed.lineCounts.length>1,'Synthetic paragraph must reflow during the current motion');
  assert(report.observed.unmountedAfterClose,'Current hide must unmount ContentTabs');
 });
 report.status='reproduced-in-isolated-real-shell';
}catch(error){report.status='probe-failed';report.error=String(error);throw error;}finally{await writeFile(resolve(directory,'baseline.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,observed:report.observed}));
