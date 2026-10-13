import {captureTextQuoteTarget} from './text-quote-target'
import {captureRegisteredTextContext,protectTextContextMouseDown,type TextContextCapture} from './text-context-adapters'
import {textContextSourceAt,captureDOMTextContext} from './text-context-selection'
import {textContextResultSchema,type TextContextRequest,type TextContextResult} from '@desktop/shared/text-context-menu'
import {activeTextDialogs} from './text-context-modal'
export interface TextContextMenuOptions {
 document:Document;show(request:TextContextRequest):Promise<TextContextResult>;cancel(requestId:string):void|Promise<void>
 writeText(text:string):Promise<void>;readText():Promise<string>
 nativeEdit(id:'text.paste'|'text.pastePlain'|'text.undo'|'text.redo',root:HTMLElement,assertCurrent:()=>void):Promise<void>
 contextIdentity?():string;subscribeContext?(listener:()=>void):()=>void;onError?(error:unknown):void
}
export function installTextContextMenu(options:TextContextMenuOptions){
 const document=options.document;let alive=true,internal=0,composing=false,operation=0
 // Disabled structured inputs cannot own focus or expose selectionStart. Only
 // an observed real primary pointer selection grants their native selection.
 let nativeSource:{root:HTMLInputElement;value:string;parent:Node|null}|null=null
 const nativePointer=(event:PointerEvent)=>{
  if(!event.isTrusted)return
  const target=event.target instanceof HTMLElement?event.target.closest('input'):null
  if(event.button===0)nativeSource=target instanceof HTMLInputElement&&target.matches(':disabled')&&target.selectionStart===null?{root:target,value:target.value,parent:target.parentNode}:null
  else if(event.button!==2||target!==nativeSource?.root)nativeSource=null
 }
 const nativeSelectionOwned=(root:HTMLElement)=>!!nativeSource&&nativeSource.root===root&&root.isConnected&&nativeSource.parent===root.parentNode&&nativeSource.value===nativeSource.root.value&&nativeSource.root.matches(':disabled')
 const nativeSelectionChanged=(event:Event)=>{
  if(!nativeSource)return
  const range=document.getSelection()?.rangeCount===1?document.getSelection()!.getRangeAt(0):null
  if(event.target!==document&&event.target!==nativeSource.root||range&&!range.collapsed)nativeSource=null
 }
 const selection=()=>{const s=document.getSelection();return [s?.anchorNode,s?.anchorOffset,s?.focusNode,s?.focusOffset]}
 let current:{id:string;source:TextContextCapture;observer:MutationObserver|null;dirty:boolean;ticket:number;context:string;quoting:boolean;expectedSelection:unknown[]}|null=null
 const cancel=()=>{const before=current;if(!before)return;current=null;before.observer?.disconnect();before.source.dispose?.();void Promise.resolve(options.cancel(before.id)).catch(()=>{})}
 const changed=(event?:Event)=>{
  if(internal)return
  if(event&&['focusin','keydown','compositionstart','blur'].includes(event.type))nativeSource=null
  if(event?.type==='selectionchange'&&current?.source.isCurrent())return
  if(event?.type==='selectionchange'&&current?.quoting&&selection().every((value,index)=>value===current!.expectedSelection[index]))return
  cancel();operation++
 }
 const contextChanged=()=>{if(current&&options.contextIdentity?.()!==current.context)changed()}
 const disposeContext=options.subscribeContext?.(contextChanged)
 const withFocus=(run:()=>void)=>{internal++;try{run()}finally{if(current)current.expectedSelection=selection();internal--}}
 const open=async(event:Event,target:HTMLElement,point?:{x:number;y:number})=>{
  if(!alive||target.closest('[data-desktop-recording="true"],[inert]'))return
  const dialogs=activeTextDialogs(document),modal=dialogs.length>0;if(modal&&!dialogs.some(dialog=>dialog.contains(target)))return
  const registered=captureRegisteredTextContext(target,point),root=registered?.root??textContextSourceAt(target)
  if(!root)return
  cancel();const source=registered??captureDOMTextContext(root,{...options,nativeSelectionOwned})
  event.preventDefault();event.stopPropagation()
  const id=crypto.randomUUID(),ticket=++operation,identity=options.contextIdentity?.()??''
  const pending={id,source,observer:null as MutationObserver|null,dirty:false,ticket,context:identity,quoting:false,expectedSelection:selection()}
  if(source.kind!=='editor'){
   const Observer=document.defaultView?.MutationObserver
   if(Observer){pending.observer=new Observer(()=>{pending.dirty=true;if(current===pending)changed()});pending.observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true})}
  }
  current=pending
  const quote=!modal&&!composing?captureTextQuoteTarget():null
  const state={...source.commands,'text.quote':source.commands['text.quote']&&!!quote}
  if(composing)for(const key of Object.keys(state))if(!['text.copy','text.selectAll','editor.context'].includes(key))state[key as keyof typeof state]=false
  const box=root.getBoundingClientRect(),at=point??{x:box.left+Math.min(24,box.width),y:box.top+Math.min(24,box.height)}
  const request:TextContextRequest={requestId:id,kind:source.kind,commands:state,position:{x:Math.max(0,Math.min(100000,at.x)),y:Math.max(0,Math.min(100000,at.y))}}
  const assertCurrent=()=>{
   if(pending.observer?.takeRecords().length)pending.dirty=true
   const sourceValid=pending.quoting?(source.isContentCurrent?.()??source.isCurrent()):source.isCurrent()
   if(!alive||current!==pending||ticket!==operation||pending.dirty||!sourceValid||document.hasFocus()===false||options.contextIdentity&&options.contextIdentity()!==identity)throw new Error('文本来源已变化，请重新操作')
  }
  try{
   const result=textContextResultSchema.parse(await options.show(request))
   if(result.requestId!==id||!result.command)return
   assertCurrent();const command=result.command
   if(!state[command])return
   if(command==='text.quote'){if(!quote?.isCurrent())throw new Error('对话已切换，请重新引用');pending.quoting=true;await quote.append(source.text,assertCurrent,withFocus)}
   else {withFocus(()=>source.restore());await source.execute(command,assertCurrent)}
  }catch(error){if(current===pending&&alive)options.onError?.(error)}
  finally{if(current===pending){current=null;pending.observer?.disconnect();source.dispose?.()}}
 }
 const context=(event:MouseEvent)=>{const target=event.target;if(target instanceof HTMLElement)void open(event,target,{x:event.clientX,y:event.clientY})}
 const key=(event:KeyboardEvent)=>{
  if(event.defaultPrevented||event.isComposing||event.keyCode===229)return
  if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const target=event.target instanceof HTMLElement?event.target:document.activeElement;if(target instanceof HTMLElement)void open(event,target)}
 }
 const down=(event:MouseEvent)=>{if(event.button===2&&event.target instanceof HTMLElement&&protectTextContextMouseDown(event.target,{x:event.clientX,y:event.clientY})){event.preventDefault();event.stopPropagation()}}
 const start=()=>{composing=true;changed()},end=()=>{composing=false;changed()}
 const events=['pointerdown','keydown','focusin','input','selectionchange']
 document.addEventListener('pointerdown',nativePointer,true)
 document.addEventListener('selectionchange',nativeSelectionChanged,true)
 for(const event of events)document.addEventListener(event,changed,true)
 document.addEventListener('mousedown',down,true);document.addEventListener('contextmenu',context,true);document.addEventListener('keydown',key,true)
 document.addEventListener('compositionstart',start,true);document.addEventListener('compositionend',end,true)
 document.addEventListener('scroll',changed,true);document.defaultView?.addEventListener('blur',changed)
 return()=>{alive=false;nativeSource=null;cancel();disposeContext?.();document.removeEventListener('pointerdown',nativePointer,true);document.removeEventListener('selectionchange',nativeSelectionChanged,true);for(const event of events)document.removeEventListener(event,changed,true);document.removeEventListener('mousedown',down,true);document.removeEventListener('contextmenu',context,true);document.removeEventListener('keydown',key,true);document.removeEventListener('compositionstart',start,true);document.removeEventListener('compositionend',end,true);document.removeEventListener('scroll',changed,true);document.defaultView?.removeEventListener('blur',changed)}
}
