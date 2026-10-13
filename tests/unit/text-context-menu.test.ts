import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import type {BrowserWindow,Menu,MenuItemConstructorOptions} from 'electron'
import {textContextCommandIds,textContextRequestSchema,type TextContextRequest} from '../../desktop/shared/text-context-menu'
import {TextContextMenus} from '../../desktop/main/text-context-menu'
const id='10111111-1111-4111-8111-111111111111',nextId='20111111-1111-4111-8111-111111111111'
const request=(kind:TextContextRequest['kind']='preview',requestId=id):TextContextRequest=>({requestId,kind,position:{x:50,y:30},commands:Object.fromEntries(textContextCommandIds.map(command=>[command,true])) as TextContextRequest['commands']})
test('TCM01 strict capabilities forbid text, unknown commands and invalid coordinates',()=>{
 const valid=request();assert.deepEqual(textContextRequestSchema.parse(valid),valid)
 for(const value of [{...valid,text:'private'}, {...valid,requestId:'invalid'}, {...valid,kind:'script'}, {...valid,commands:{...valid.commands,'app.quit':true}}, {...valid,commands:{...valid.commands,'text.copy':'yes'}}, ...[NaN,Infinity,-1,100001].map(x=>({...valid,position:{x,y:0}}))])assert.equal(textContextRequestSchema.safeParse(value).success,false)
})
function fixture(){
 let template:MenuItemConstructorOptions[]=[],popup:any,closes=0
 const owner=Object.assign(new EventEmitter(),{isDestroyed:()=>false,isFocused:()=>true,getContentBounds:()=>({x:100,y:120,width:600,height:400}),webContents:Object.assign(new EventEmitter(),{getZoomFactor:()=>2,mainFrame:{url:'xaanink://app/'}})}) as unknown as BrowserWindow
 const menus=new TextContextMenus(rows=>{template=rows;return {popup:(args:any)=>{popup=args},closePopup:()=>{closes++}} as unknown as Menu})
 return {owner,menus,get template(){return template},get popup(){return popup},get closes(){return closes}}
}
for(const kind of ['preview','input','editor'] as const)test(`TCM02 ${kind} groups and disabled capabilities`,async()=>{
 const f=fixture(),state=request(kind);state.commands['text.cut']=false
 const pending=f.menus.open(f.owner,state,{platform:'win32',shortcuts:{'text.copy':['Ctrl+Shift+C']}})
 const ids=f.template.map(row=>row.id).filter(Boolean)
 assert.equal(ids.includes('text.undo'),kind!=='preview');assert.equal(ids.includes('editor.context'),kind==='editor')
 assert.equal(f.template.find(row=>row.id==='text.cut')?.enabled,false)
 assert.equal(f.template.find(row=>row.id==='text.copy')?.accelerator,'Ctrl+Shift+C')
 assert.equal(f.template.find(row=>row.id==='text.copy')?.registerAccelerator,false)
 assert.ok(!f.template.some((row,index)=>row.type==='separator'&&(index===0||index===f.template.length-1||f.template[index-1].type==='separator')))
 f.popup.callback();assert.deepEqual(await pending,{requestId:id,command:null})
})
test('TCM03 stale cancel cannot close replacement request; matching choice preserves requestId',async()=>{
 const f=fixture(),a=f.menus.open(f.owner,request()),b=f.menus.open(f.owner,request('input',nextId))
 assert.deepEqual(await a,{requestId:id,command:null});const before=f.closes
 f.menus.cancel(f.owner,id);assert.equal(f.closes,before)
 const copy=f.template.find(row=>row.id==='text.copy')!;await (copy.click as Function)()
 assert.deepEqual(await b,{requestId:nextId,command:'text.copy'})
 assert.equal(f.owner.listenerCount('blur'),0);assert.equal(f.owner.listenerCount('closed'),0)
})
for(const event of ['blur','closed','did-start-navigation'] as const)test(`TCM03 ${event} releases request`,async()=>{
 const f=fixture(),pending=f.menus.open(f.owner,request());if(event==='did-start-navigation')f.owner.webContents.emit(event);else f.owner.emit(event)
 assert.deepEqual(await pending,{requestId:id,command:null});assert.equal(f.owner.listenerCount('blur'),0)
})
