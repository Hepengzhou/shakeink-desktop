"use client"
import {CommandTargets,type CommandTarget} from "./command-targets"
import {platformCommands,type DesktopCommand,type DesktopPlatform} from "@desktop/shared/command-registry"
import {canonicalKey} from "@desktop/core/shortcuts"

export const desktopCommandTargets=new CommandTargets<HTMLElement|null>()
const catalogs=new Map<unknown,{commands:DesktopCommand[];priority:number}>()
const listeners=new Set<()=>void>()
let version=0
const cache=new Map<DesktopPlatform,{version:number;commands:DesktopCommand[]}>()
const catalogStatus=new Map<DesktopPlatform,"loading"|"ready"|"unavailable">()
export function desktopCatalogStatus(platform:DesktopPlatform){return catalogStatus.get(platform)??"loading"}
export function setDesktopCatalogStatus(platform:DesktopPlatform,status:"loading"|"ready"|"unavailable"){catalogStatus.set(platform,status);changed()}
export function registerDesktopCommandTarget(target:CommandTarget<HTMLElement|null>){return desktopCommandTargets.register(target)}
export function publishDesktopCommands(owner:unknown,commands:DesktopCommand[],priority=0){
 const snapshot={commands:structuredClone(commands),priority}
 catalogs.set(owner,snapshot);changed()
 return()=>{if(catalogs.get(owner)===snapshot){catalogs.delete(owner);changed()}}
}
function changed(){version++;for(const listener of listeners)listener()}
export function subscribeDesktopCommands(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function desktopCommandCatalog(platform:DesktopPlatform):DesktopCommand[]{
 const cached=cache.get(platform);if(cached?.version===version)return cached.commands
 const rows=new Map(platformCommands(platform).map(command=>[command.id,command]))
 const dynamic=new Map<string,{command:DesktopCommand;priority:number}>()
 for(const {commands,priority} of catalogs.values())for(const command of commands){
  const previous=dynamic.get(command.id)
  if(!previous||priority>previous.priority){dynamic.set(command.id,{command,priority});continue}
  if(priority<previous.priority)continue
  const unique=new Map([...previous.command.defaults,...command.defaults].map(binding=>[canonicalKey(binding),binding]))
  dynamic.set(command.id,{command:{...command,...previous.command,defaults:[...unique.values()]},priority})
 }
 for(const {command} of dynamic.values()){
  const existing=rows.get(command.id)
  if(!existing){rows.set(command.id,command);continue}
  const unique=new Map([...existing.defaults,...command.defaults].map(binding=>[canonicalKey(binding),binding]))
  // Static identities supply user-facing labels and scopes; the installed
  // editor supplies when-expressions, native IDs and all secondary bindings.
  rows.set(command.id,{...command,...existing,defaults:[...unique.values()]})
 }
 const commands=[...rows.values()];cache.set(platform,{version,commands});return commands
}
/** Ignore menu focus itself so a command acts on the element selected before
 * opening the native/Windows menu. Dialog input focus replaces that target. */
let lastTarget:HTMLElement|null=null
let lastEditorTarget:HTMLElement|null=null
export function rememberDesktopCommandTarget(target:HTMLElement|null){
 if(target?.closest('[role="menu"], [data-desktop-menu-button]'))return
 lastTarget=target
 if(target?.closest('.desktop-markdown-editor'))lastEditorTarget=target
}
export function desktopCommandTarget(){return lastTarget?.isConnected?lastTarget:null}
export function visibleDesktopCommandTarget(element:HTMLElement|null|undefined){
 return !!(element?.isConnected&&element.getClientRects().length&&!element.closest('[inert],[hidden],[aria-hidden="true"]'))
}
export function desktopEditorTarget(){
 if(visibleDesktopCommandTarget(lastEditorTarget)&&visibleDesktopCommandTarget(lastEditorTarget?.closest<HTMLElement>('.desktop-markdown-editor')))return lastEditorTarget
 const visible=[...document.querySelectorAll<HTMLElement>('.content-tabs .desktop-markdown-editor')].filter(visibleDesktopCommandTarget)
 return visible.length===1?visible[0]:null
}
