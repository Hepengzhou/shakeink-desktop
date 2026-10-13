import type {BrowserWindow,Menu,MenuItemConstructorOptions} from 'electron'
import {textContextCommands,type TextContextCommand,type TextContextRequest,type TextContextResult} from '../shared/text-context-menu'
import {platformCommands,electronAccelerator,type DesktopPlatform} from '../shared/command-registry'
import {bindingsFor} from '../core/shortcuts'
interface MenuSettings {platform:DesktopPlatform;shortcuts:Record<string,string[]>}
export class TextContextMenus {
 private pending=new Map<BrowserWindow,{id:string;cancel():void}>()
 constructor(private build:(template:MenuItemConstructorOptions[])=>Menu){}
 cancel(owner:BrowserWindow,requestId:string){const pending=this.pending.get(owner);if(pending?.id===requestId)pending.cancel()}
 open(owner:BrowserWindow,request:TextContextRequest,settings:MenuSettings={platform:'win32',shortcuts:{}}):Promise<TextContextResult>{
  this.pending.get(owner)?.cancel()
  const cancelled={requestId:request.requestId,command:null} satisfies TextContextResult
  if(owner.isDestroyed()||!owner.isFocused())return Promise.resolve(cancelled)
  return new Promise(resolve=>{
   let done=false,menu:Menu|undefined
   const finish=(command:TextContextCommand|null)=>{
    if(done)return;done=true
    if(this.pending.get(owner)?.id===request.requestId)this.pending.delete(owner)
    owner.removeListener('closed',cancel);owner.removeListener('blur',cancel);owner.webContents.removeListener('did-start-navigation',cancel)
    try{menu?.closePopup(owner)}catch{/* Closed native owner. */}
    resolve({requestId:request.requestId,command})
   }
   const cancel=()=>finish(null),catalog=platformCommands(settings.platform)
   const rows=textContextCommands.filter(row=>request.kind!=='preview'||!['text.undo','text.redo'].includes(row.id))
   const template:MenuItemConstructorOptions[]=[]
   for(const row of rows){
    if(['text.undo','text.cut','text.delete'].includes(row.id))template.push({type:'separator'})
    const command=catalog.find(command=>command.id===row.id),binding=command?bindingsFor(command,settings.shortcuts)[0]:undefined
    const accelerator=electronAccelerator(binding)
    template.push({id:row.id,label:binding&&!accelerator?`${row.label}    ${binding}`:row.label,enabled:request.commands[row.id],...(accelerator?{accelerator,registerAccelerator:false}:{}),click:()=>finish(owner.isDestroyed()||!owner.isFocused()?null:row.id)})
   }
   if(request.kind==='editor'&&request.commands['editor.context'])template.push({type:'separator'},{id:'editor.context',label:'编辑器操作',click:()=>finish(owner.isDestroyed()||!owner.isFocused()?null:'editor.context')})
   try{
    menu=this.build(template);this.pending.set(owner,{id:request.requestId,cancel})
    owner.once('closed',cancel);owner.once('blur',cancel);owner.webContents.once('did-start-navigation',cancel)
    const bounds=owner.getContentBounds(),zoom=owner.webContents.getZoomFactor()
    menu.popup({window:owner,frame:owner.webContents.mainFrame,x:Math.round(Math.min(Math.max(0,request.position.x*zoom),bounds.width-1)),y:Math.round(Math.min(Math.max(0,request.position.y*zoom),bounds.height-1)),callback:cancel})
   }catch{cancel()}
  })
 }
}
