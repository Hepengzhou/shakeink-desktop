import {bindingsFor,type ShortcutCommand} from "@desktop/core/shortcuts"
type Overrides=Record<string,string[]>
const row=(commands:ShortcutCommand[],id:string)=>{const command=commands.find(command=>command.id===id);if(!command)throw new Error("输入命令尚未就绪");return command}
/** A missing namespace falls back to the command defaults instead of letting
 * bindingsFor dereference undefined. Callers pass
 * settings.shortcuts[bootstrap.platform], so any host whose platform has no
 * namespace (see the bootstrap normalization in main/index.ts) must degrade
 * to default hints rather than blank the renderer. */
export function composerBindingHint(commands:ShortcutCommand[],overrides:Overrides|undefined){
 const bindings=overrides??{}
 const send=bindingsFor(row(commands,"ai.send"),bindings),newline=bindingsFor(row(commands,"ai.newline"),bindings)
 return [send.length?`${send.join("、")} 发送`:"点击发送按钮",newline.length?`${newline.join("、")} 换行`:"换行快捷键未设置"].join("，")
}
