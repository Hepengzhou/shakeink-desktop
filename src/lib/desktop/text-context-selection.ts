import {emptyTextContextCapabilities,type TextContextCommand} from '@desktop/shared/text-context-menu'
import type {TextContextCapture} from './text-context-adapters'
import {isAPIKeyControl} from './input-commands'
import {selectedEditorText,selectedEditorVisibleText,deleteDraftSelection} from '@/components/chat/composer-editor'
const textTypes=new Set(['text','search','tel','url','email','password','number','date','datetime-local','month','week','time'])
export function textContextSourceAt(target:HTMLElement):HTMLElement|null {
 const control=target.closest<HTMLElement>('input,textarea')
 if(control&&!control.matches('.inputarea,.native-edit-context,.ime-text-area'))return control.tagName==='TEXTAREA'||textTypes.has((control as HTMLInputElement).type)?control:null
 const composer=target.closest<HTMLElement>('.chat-composer-editable');if(composer)return composer
 if(target.closest('.monaco-editor'))return null
 const editable=target.closest<HTMLElement>('[contenteditable="true"],[contenteditable="plaintext-only"]');if(editable)return editable
 if(target.ownerDocument.defaultView?.getComputedStyle(target).userSelect==='none')return null
 return target.closest<HTMLElement>('[data-text-preview],[data-text-input]')
}
function selectionIdentity(document:Document){const s=document.getSelection();return {anchor:s?.anchorNode,focus:s?.focusNode,start:s?.anchorOffset,end:s?.focusOffset}}
function sameSelection(document:Document,before:ReturnType<typeof selectionIdentity>){const s=selectionIdentity(document);return s.anchor===before.anchor&&s.focus===before.focus&&s.start===before.start&&s.end===before.end}
/** Only readonly sources may clip a browser paragraph boundary to the source. */
export function readTextContextRange(root:HTMLElement,editable=false){
 const document=root.ownerDocument,s=document.getSelection(),range=s?.rangeCount===1?s.getRangeAt(0):null
 let text='',clipped:Range|null=null,normalized=false
 const before=selectionIdentity(document),owned=range&&root.contains(range.startContainer)&&root.contains(range.endContainer)
 if(s&&range&&!range.collapsed&&(!editable||owned)&&range.intersectsNode(root)){
  clipped=range.cloneRange();const content=document.createRange();content.selectNodeContents(root)
  if(clipped.compareBoundaryPoints(Range.START_TO_START,content)<0)clipped.setStart(content.startContainer,content.startOffset)
  if(clipped.compareBoundaryPoints(Range.END_TO_END,content)>0)clipped.setEnd(content.endContainer,content.endOffset)
  if(!clipped.collapsed){
   if(owned)text=s.toString()
   else {normalized=true;try{s.removeAllRanges();s.addRange(clipped);text=s.toString()}finally{if(before.anchor&&before.focus)s.setBaseAndExtent(before.anchor,before.start!,before.focus,before.end!)}}
  }
 }
 return {text,range:clipped,normalized,before,isCurrent:()=>sameSelection(document,before)}
}
export function captureDOMTextContext(root:HTMLElement,options:{writeText(text:string):Promise<void>;readText():Promise<string>;nativeEdit(id:'text.paste'|'text.pastePlain'|'text.undo'|'text.redo',root:HTMLElement,assertCurrent:()=>void):Promise<void>;nativeSelectionOwned?(root:HTMLElement):boolean}):TextContextCapture {
 const document=root.ownerDocument,control=root instanceof HTMLInputElement||root instanceof HTMLTextAreaElement?root:null
 const editable=control?!control.disabled&&!control.matches(':disabled')&&!control.readOnly:root.isContentEditable
 const sensitive=control?.type==='password',apiKey=isAPIKeyControl(root)
 // Shadow/native control selections are readable only while that exact field owns focus.
 const nativeSelection=!!control&&typeof control.selectionStart!=='number'
 const dom=control?null:readTextContextRange(root,editable)
 const ownsNative=()=>document.activeElement===root||options.nativeSelectionOwned?.(root)===true
 const text=control?nativeSelection?(ownsNative()?document.getSelection()?.toString()??'':''):control.value.slice(control.selectionStart!,control.selectionEnd!):root.matches('.chat-composer-editable')?selectedEditorVisibleText(root)??'':dom!.text
 const copyText=root.matches('.chat-composer-editable')?selectedEditorText(root)??'':text
 const before=control?JSON.stringify([control.value,control.selectionStart,control.selectionEnd,control.selectionDirection,nativeSelection?document.getSelection()?.toString():null]):root.innerHTML
 const originalValue=control?.value
 const selection=selectionIdentity(document),query=(id:string)=>{try{return document.queryCommandEnabled(id)}catch{return false}}
 const state=emptyTextContextCapabilities(),canCopy=!!copyText&&(!sensitive||apiKey)
 state['text.quote']=!!text.trim()&&!sensitive
 state['text.copy']=canCopy;state['text.cut']=canCopy&&editable&&(apiKey||query('cut'))
 state['text.paste']=state['text.pastePlain']=editable&&(root.matches('.chat-composer-editable')||document.queryCommandSupported?.('insertText')===true)
 // Structured date/time fields do not accept Chromium insertText, regardless of global support.
 if(control&&['date','datetime-local','month','week','time'].includes(control.type))state['text.paste']=state['text.pastePlain']=false
 state['text.delete']=editable&&!!text&&query('delete')
 state['text.undo']=editable&&query('undo');state['text.redo']=editable&&query('redo');state['text.selectAll']=true
 if(control&&nativeSelection&&(control.disabled||control.matches(':disabled')))state['text.selectAll']=false
 const current=()=>root.isConnected&&root.ownerDocument===document&&(control?
  before===JSON.stringify([control.value,control.selectionStart,control.selectionEnd,control.selectionDirection,nativeSelection?document.getSelection()?.toString():null])&&(!nativeSelection||ownsNative())&&editable===(!control.disabled&&!control.matches(':disabled')&&!control.readOnly):before===root.innerHTML&&dom!.isCurrent()&&editable===root.isContentEditable)
 const restore=()=>{
  if(document.activeElement!==root&&(control&&!control.disabled&&!control.matches(':disabled')||editable))root.focus({preventScroll:true})
  if(control&&typeof control.selectionStart==='number')control.setSelectionRange(control.selectionStart!,control.selectionEnd!,control.selectionDirection??'none')
  else if(!control&&selection.anchor&&selection.focus)document.getSelection()?.setBaseAndExtent(selection.anchor,selection.start!,selection.focus,selection.end!)
 }
 const remove=()=>{if(root.matches('.chat-composer-editable'))deleteDraftSelection(root);else if(!document.execCommand('delete',false))throw new Error('当前选区无法删除')}
 return {root,kind:control||root.matches('.chat-composer-editable,[data-text-input],[contenteditable="true"],[contenteditable="plaintext-only"]')?'input':'preview',text:sensitive?'':text,commands:state,normalizedSelection:dom?.normalized,
  isCurrent:current,restore,
  isContentCurrent:()=>root.isConnected&&root.ownerDocument===document&&(control?control.value===originalValue&&editable===(!control.disabled&&!control.matches(':disabled')&&!control.readOnly):root.innerHTML===before&&editable===root.isContentEditable),
  async execute(id:TextContextCommand,assertCurrent){
   assertCurrent()
   if(id==='text.copy'||id==='text.cut'){
    if(!copyText||copyText.length>1024*1024)throw new Error('选区不可复制或内容过长')
    await options.writeText(copyText);assertCurrent();if(id==='text.cut'){restore();assertCurrent();remove()}return
   }
   if(id==='text.selectAll'){
    if(control){if(control.disabled){control.setSelectionRange?.(0,control.value.length);return}root.focus({preventScroll:true});if(typeof control.selectionStart==='number')control.setSelectionRange(0,control.value.length);else document.execCommand('selectAll',false)}
    else {if(editable)root.focus({preventScroll:true});const range=document.createRange();range.selectNodeContents(root);const s=document.getSelection();s?.removeAllRanges();s?.addRange(range)}return
   }
   restore();assertCurrent()
   if(id==='text.delete'){remove();return}
   if(['text.paste','text.pastePlain','text.undo','text.redo'].includes(id)){
    if(control&&nativeSelection){
     if(id==='text.undo'||id==='text.redo'){if(!document.execCommand(id==='text.undo'?'undo':'redo',false))throw new Error('当前输入框无法执行历史操作');return}
     const value=await options.readText();assertCurrent();if(value&&(!document.execCommand('insertText',false,value)))throw new Error('当前输入框无法粘贴');return
    }
    await options.nativeEdit(id as 'text.paste'|'text.pastePlain'|'text.undo'|'text.redo',root,assertCurrent)
   }
  },
 }
}
