import {z} from 'zod'
export const textContextCommands=[
 {id:'text.quote',label:'引用到对话'},{id:'text.undo',label:'撤销'},{id:'text.redo',label:'重做'},
 {id:'text.cut',label:'剪切'},{id:'text.copy',label:'复制'},{id:'text.paste',label:'粘贴'},
 {id:'text.pastePlain',label:'粘贴为纯文本'},{id:'text.delete',label:'删除'},{id:'text.selectAll',label:'全选'},
] as const
export const textContextCommandIds=[...textContextCommands.map(row=>row.id),'editor.context'] as const
export type TextContextCommand=typeof textContextCommandIds[number]
export const textContextCapabilitiesSchema=z.object({
 'text.quote':z.boolean(),'text.undo':z.boolean(),'text.redo':z.boolean(),
 'text.cut':z.boolean(),'text.copy':z.boolean(),'text.paste':z.boolean(),'text.pastePlain':z.boolean(),
 'text.delete':z.boolean(),'text.selectAll':z.boolean(),'editor.context':z.boolean(),
}).strict()
export const textContextRequestSchema=z.object({requestId:z.uuid(),kind:z.enum(['preview','input','editor']),commands:textContextCapabilitiesSchema,position:z.object({x:z.number().min(0).max(100000),y:z.number().min(0).max(100000)}).strict()}).strict()
export const textContextResultSchema=z.object({requestId:z.uuid(),command:z.enum(textContextCommandIds).nullable()}).strict()
export type TextContextRequest=z.infer<typeof textContextRequestSchema>
export type TextContextResult=z.infer<typeof textContextResultSchema>
export type TextContextCapabilities=z.infer<typeof textContextCapabilitiesSchema>
export function emptyTextContextCapabilities():TextContextCapabilities{return Object.fromEntries(textContextCommandIds.map(id=>[id,false])) as TextContextCapabilities}
