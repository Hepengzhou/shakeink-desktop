import {MENTION_TOKEN_RE} from '@/lib/mention-token'
export type TextQuoteFocus=(run:()=>void)=>void
export interface TextQuoteTarget {identity():string;available():boolean;append(text:string,assertCurrent:()=>void,focus:TextQuoteFocus):void|Promise<void>;subscribe?(listener:()=>void):()=>void}
let current:TextQuoteTarget|null=null,revision=0,lastIdentity='',lastAvailable=false,activeSubscription:(()=>void)|undefined
export function formatTextQuote(text:string){
 const escaped=text.replace(/\r\n?/g,'\n').replace(new RegExp(MENTION_TOKEN_RE.source,'g'),token=>token.replace('@[','@\\['))
 return escaped.split('\n').map(line=>'> '+line).join('\n')+'\n\n'
}
export function registerTextQuoteTarget(target:TextQuoteTarget){
 activeSubscription?.()
 current=target;revision++;lastIdentity=target.identity();lastAvailable=target.available()
 const changed=()=>{const identity=target.identity(),available=target.available();if(identity!==lastIdentity||available!==lastAvailable){revision++;lastIdentity=identity;lastAvailable=available}}
 const dispose=target.subscribe?.(changed)
 activeSubscription=dispose
 return()=>{dispose?.();if(current===target){current=null;activeSubscription=undefined;revision++}}
}
export function refreshTextQuoteTarget(){if(!current)return;const identity=current.identity(),available=current.available();if(identity!==lastIdentity||available!==lastAvailable){revision++;lastIdentity=identity;lastAvailable=available}}
export function captureTextQuoteTarget(){
 refreshTextQuoteTarget();const target=current,ticket=revision
 if(!target?.available())return null
 const isCurrent=()=>{refreshTextQuoteTarget();return current===target&&revision===ticket&&target.available()}
 const assertCurrent=()=>{if(!isCurrent())throw new Error('对话已变化，请重新引用')}
 return {isCurrent,async append(text:string,assertSourceCurrent:()=>void=()=>{},focus:TextQuoteFocus=run=>run()){
  const assertBoth=()=>{assertSourceCurrent();assertCurrent()}
  assertBoth();await target.append(formatTextQuote(text),assertBoth,focus)
 }}
}
