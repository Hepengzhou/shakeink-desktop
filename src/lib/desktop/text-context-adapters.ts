import type {TextContextCommand,TextContextCapabilities,TextContextRequest} from '@desktop/shared/text-context-menu'
export interface TextContextCapture {
 root:HTMLElement;kind:TextContextRequest['kind'];text:string;commands:TextContextCapabilities
 isCurrent():boolean;restore():void;execute(id:TextContextCommand,assertCurrent:()=>void):void|Promise<void>
 /** Quote transfers focus/selection, while its original content must stay valid. */
 isContentCurrent?():boolean
 dispose?():void
 // Readonly range normalization can schedule one selectionchange while
 // preserving the original endpoints. User input still cancels by epoch.
 normalizedSelection?:boolean
}
export interface TextContextAdapter {
 capture(target:HTMLElement,point?:{x:number;y:number}):TextContextCapture|null
 protectRightMouseDown?(target:HTMLElement,point:{x:number;y:number}):boolean
}
const adapters=new Set<TextContextAdapter>()
export function registerTextContextAdapter(adapter:TextContextAdapter){adapters.add(adapter);return()=>{adapters.delete(adapter)}}
export function captureRegisteredTextContext(target:HTMLElement,point?:{x:number;y:number}){for(const adapter of adapters){const captured=adapter.capture(target,point);if(captured)return captured}return null}
export function protectTextContextMouseDown(target:HTMLElement,point:{x:number;y:number}){for(const adapter of adapters)if(adapter.protectRightMouseDown?.(target,point))return true;return false}
