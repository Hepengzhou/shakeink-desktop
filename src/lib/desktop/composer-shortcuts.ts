import {bindingsFor,type ShortcutCommand} from "@desktop/core/shortcuts"
type Overrides=Record<string,string[]>
const row=(commands:ShortcutCommand[],id:string)=>{const command=commands.find(command=>command.id===id);if(!command)throw new Error("输入命令尚未就绪");return command}
export function composerBindingHint(commands:ShortcutCommand[],overrides:Overrides){
 const send=bindingsFor(row(commands,"ai.send"),overrides),newline=bindingsFor(row(commands,"ai.newline"),overrides)
 return [send.length?`${send.join("、")} 发送`:"点击发送按钮",newline.length?`${newline.join("、")} 换行`:"换行快捷键未设置"].join("，")
}
