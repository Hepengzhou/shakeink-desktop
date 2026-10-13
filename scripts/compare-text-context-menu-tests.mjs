import {readFile,writeFile} from 'node:fs/promises'
const directory='docs/evidence/text-context-menu'
function parse(text){
 const failures=[...text.matchAll(/^not ok \d+ - (.+)\r?\n([\s\S]*?)(?=^# Subtest:|^1\.\.|(?![\s\S]))/gm)].map(match=>({title:match[1].trim(),location:/location: '([^']+)'/.exec(match[2])?.[1]?.replaceAll('\\\\','\\'),error:/error: (.+)/.exec(match[2])?.[1]?.trim()}))
 const count=name=>Number(new RegExp('^# '+name+' (\\d+)','m').exec(text)?.[1]??0)
 return {tests:count('tests'),passed:count('pass'),failed:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),allPassed:count('fail')===0&&count('cancelled')===0,failures}
}
const before=parse(await readFile(directory+'/core-before.tap','utf8')),after=parse(await readFile(directory+'/core-after.tap','utf8'))
const previous=new Set(before.failures.map(item=>item.title)),newFailures=after.failures.filter(item=>!previous.has(item.title))
const report={scope:'Actual core runs. Same-title does not by itself prove an identical cause; targeted reruns are recorded separately.',before,after,newFailures,resolvedOriginalTitles:before.failures.filter(item=>!after.failures.some(later=>later.title===item.title)).map(item=>item.title)}
try{const final=parse(await readFile(directory+'/core-final.tap','utf8'));report.final=final;report.finalNewFailures=final.failures.filter(item=>!previous.has(item.title))}catch(error){if(error.code!=='ENOENT')throw error}
await writeFile(directory+'/core-comparison.json',JSON.stringify(report,null,2)+'\n')
const files=[...new Set(after.failures.map(item=>/tests\\(.+?\.test\.ts)/.exec(item.location??'')?.[0]?.replaceAll('\\','/')).filter(Boolean))]
await writeFile(directory+'/core-failed-files.json',JSON.stringify(files,null,2)+'\n')
console.log(JSON.stringify({before:{tests:before.tests,failed:before.failed},after:{tests:after.tests,failed:after.failed},newFailures:newFailures.length,final:report.final?{tests:report.final.tests,failed:report.final.failed,newFailureTitles:report.finalNewFailures.length}:null,failedFiles:files.length}))
