import type {WebContents} from 'electron'
import {PROJECT_REPOSITORY_URL,PROJECT_STAR_COPY,PROJECT_STAR_HINT} from '../shared/project-info'
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))

export function projectAboutHtml(version:string,theme:'paper'|'ink'):string {
 const ink=theme==='ink'
 return `<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>关于玄印写作</title><style>
html{color-scheme:${ink?'dark':'light'};background:${ink?'#1b1613':'#fffcf4'};color:${ink?'#ece1cf':'#342b23'}}body{font:14px/1.6 system-ui;text-align:center;margin:0;padding:24px;-webkit-user-select:none;user-select:none}h1{font-size:26px;margin:0 0 12px}p{margin:10px 0}.muted{color:${ink?'#b4a593':'#756959'}}.support{margin-top:22px;padding-top:16px;border-top:1px solid ${ink?'#45382e':'#ddd2bd'}}a{display:inline-block;border:1px solid ${ink?'#dfb471':'#8b5d26'};border-radius:8px;padding:8px 14px;color:${ink?'#dfb471':'#8b5d26'};text-decoration:none}a:hover{background:${ink?'#32271d':'#f4e9d6'}}a:focus-visible{outline:2px solid currentColor;outline-offset:3px}small{display:block;font-size:11px;margin-top:10px}
</style><body><h1>玄印写作</h1><p>版本 ${escapeHtml(version)}</p><p class="muted">本地创作，由你的模型驱动</p><p class="muted">GPL-3.0 · ShakeInk</p><div class="support"><p>${PROJECT_STAR_COPY.about.message}</p><a href="${PROJECT_REPOSITORY_URL}" target="_blank" rel="noopener noreferrer">☆ ${PROJECT_STAR_COPY.about.label} ↗</a><small class="muted">${PROJECT_STAR_HINT}</small></div></body></html>`
}

export function installProjectAboutLinks(contents:Pick<WebContents,'on'|'setWindowOpenHandler'>,open:(url:string)=>Promise<void>,onError:()=>void):void {
 const forward=(url:string)=>{if(url===PROJECT_REPOSITORY_URL)void open(PROJECT_REPOSITORY_URL).catch(onError)}
 contents.setWindowOpenHandler(({url})=>{forward(url);return {action:'deny'}})
 contents.on('will-navigate',(event,url)=>{
  event.preventDefault()
  forward(url)
 })
}
