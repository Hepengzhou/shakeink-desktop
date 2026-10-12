import assert from "node:assert/strict"
import {test} from "node:test"
import {readFileSync} from "node:fs"
import {createRequire} from "node:module"
import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from "react"
import ts from "typescript"
import {transformSync} from "esbuild"

// Execute the actual ChatPanel JSX/keydown callbacks, and the actual Zustand
// persist store. Bounded wrappers are unit fixtures, not native UI evidence.
const require=createRequire(import.meta.url)
const source=readFileSync(new URL("../../src/components/layout/ChatPanel.tsx",import.meta.url),"utf8")
const ast=ts.createSourceFile("ChatPanel.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const elements:ts.JsxElement[]=[]
const selfClosing:ts.JsxSelfClosingElement[]=[]
const visit=(node:ts.Node)=>{if(ts.isJsxElement(node))elements.push(node);if(ts.isJsxSelfClosingElement(node))selfClosing.push(node);ts.forEachChild(node,visit)}
visit(ast)
const menu=elements.find(node=>node.openingElement.tagName.getText(ast)==="DropdownMenu"&&node.getText(ast).includes('title="对话模式"'))!
const editable=selfClosing.find(node=>node.tagName.getText(ast)==="div"&&node.attributes.getText(ast).includes("chat-composer-editable"))!
const keyAttribute=editable.attributes.properties.find((node):node is ts.JsxAttribute=>ts.isJsxAttribute(node)&&node.name.getText(ast)==="onKeyDown")!
const keyCallback=(keyAttribute.initializer as ts.JsxExpression).expression!

function jsx(mode:"standard"|"plan"){
 const calls:string[]=[]
 const names=["DropdownMenu","DropdownMenuTrigger","DropdownMenuContent","DropdownMenuItem","DropdownMenuSeparator","DropdownMenuGroup","DropdownMenuLabel","Shield","ClipboardList","ChevronDown","Check","Keyboard"]
 const wrappers=Object.fromEntries(names.map(name=>[name,({children}:{children?:ReactNode})=>createElement("span",null,children)]))
 const code=transformSync(`const menu=${menu.getText(ast)}`,{loader:"tsx",jsx:"automatic",format:"cjs"}).code
 const tree=new Function("require","mode","setMode","sendPreset","saveSendPreset",...names,`${code};return menu`)(require,mode,(value:string)=>calls.push(value),"enter",()=>{throw Error("Removed preset must not run")},...names.map(name=>wrappers[name])) as ReactElement<{children?:ReactNode}>
 const nodes:ReactElement<Record<string,unknown>>[]=[]
 const collect=(node:ReactNode)=>Children.forEach(node,child=>{if(isValidElement<Record<string,unknown>>(child)){nodes.push(child);collect(child.props.children as ReactNode)}})
 collect(tree)
 const text=(node:ReactNode):string=>Children.toArray(node).map(child=>typeof child==="string"||typeof child==="number"?String(child):isValidElement<{children?:ReactNode}>(child)?text(child.props.children):"").join("")
 return {calls,nodes,wrappers,text,tree}
}

for(const mode of ["standard","plan"] as const)test(`CSO-0${mode==="standard"?1:2}: mode menu contains only working standard/plan choices (${mode})`,()=>{
 const f=jsx(mode),items=f.nodes.filter(node=>node.type===f.wrappers.DropdownMenuItem)
 assert.deepEqual(items.map(item=>f.text(item)),["标准模式","计划模式"])
 assert.doesNotMatch(f.text(f.tree),/发送方式|Enter|换行/)
 assert.equal(f.nodes.filter(node=>node.type===f.wrappers.DropdownMenuSeparator).length,0)
 assert.equal(f.nodes.filter(node=>node.type===f.wrappers.Check).length,1)
 for(const [index,item] of items.entries()){
  const selected=Children.toArray(item.props.children as ReactNode).some(child=>isValidElement(child)&&child.type===f.wrappers.Check)
  assert.equal(selected,index===(mode==="standard"?0:1))
  ;(item.props.onClick as ()=>void)()
 }
 assert.deepEqual(f.calls,["standard","plan"])
})

function fallback({desktop=false,mention=false}:{desktop?:boolean;mention?:boolean}={}){
 const calls:string[]=[],code=transformSync(`const callback=${keyCallback.getText(ast)}`,{loader:"ts",format:"cjs"}).code
 const callback=new Function("useDesktopStore","mention","flatMentionItems","setMentionIndex","mentionIndex","selectMention","mentionDismissedRef","setMention","isGenerating","stop","enterToSend","handleSend",`${code};return callback`)(
  {getState:()=>({bootstrap:desktop?{}:null})},mention?{}:null,[{}],()=>calls.push("navigate"),0,()=>calls.push("mention"),{current:null},()=>calls.push("close"),false,()=>calls.push("stop"),false,()=>calls.push("send"),
 ) as (event:object)=>void
 return {calls,key(key:string,shiftKey=false,isComposing=false,keyCode=0){let prevented=false;callback({key,shiftKey,nativeEvent:{isComposing,keyCode},preventDefault(){prevented=true}});return prevented}}
}
test("CSO-03: legacy false preference cannot reverse Enter send / Shift+Enter newline",()=>{
 const f=fallback()
 assert.equal(f.key("Enter"),true);assert.deepEqual(f.calls,["send"])
 assert.equal(f.key("Enter",true),false);assert.deepEqual(f.calls,["send"])
})
for(const marker of ["isComposing","keyCode229"] as const)test(`CSO-04: ${marker} Enter does not send or select a mention`,()=>{
 for(const mention of [false,true]){
  const f=fallback({mention})
  assert.equal(f.key("Enter",false,marker==="isComposing",marker==="keyCode229"?229:0),false)
  assert.deepEqual(f.calls,[])
 }
})
test("CSO-04: mention Enter selects and Escape closes before sending",()=>{
 const f=fallback({mention:true})
 assert.equal(f.key("Enter"),true);assert.equal(f.key("Escape"),true)
 assert.deepEqual(f.calls,["mention","close"])
})
test("CSO-04: desktop keydown stays owned by the shared capture dispatcher",()=>{
 const f=fallback({desktop:true})
 assert.equal(f.key("Enter"),false);assert.equal(f.key("Enter",true),false)
 assert.deepEqual(f.calls,[])
})
test("CSO-05: actual persist rehydration drops old send preference and preserves both model memories on the next write",async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,"localStorage"),values=new Map<string,string>()
 const name="chat-model-effort-memory",modelEffortMemory={"local-test-model":"high"},lastModelChoice={modelId:"local-test-model",effort:"high"}
 Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}})
 try{
  const code=transformSync(readFileSync(new URL("../../src/stores/chat.ts",import.meta.url),"utf8"),{loader:"ts",format:"cjs"}).code
  const module={exports:{} as {useChatStore:typeof import("../../src/stores/chat").useChatStore}}
  new Function("module","exports","require",code)(module,module.exports,require)
  const store=module.exports.useChatStore
  values.set(name,JSON.stringify({version:0,state:{enterToSend:false,modelEffortMemory,lastModelChoice}}))
  await store.persist.rehydrate()
  assert.equal(Object.hasOwn(store.getState(),"enterToSend"),false)
  assert.deepEqual(store.getState().modelEffortMemory,modelEffortMemory)
  assert.deepEqual(store.getState().lastModelChoice,lastModelChoice)
  store.getState().setDraft("隔离草稿")
  assert.deepEqual(JSON.parse(values.get(name)!).state,{modelEffortMemory,lastModelChoice})
 }finally{if(previous)Object.defineProperty(globalThis,"localStorage",previous);else Reflect.deleteProperty(globalThis,"localStorage")}
})
