// Production services/schema, solely in an empty owned temporary fixture root.
import assert from 'node:assert/strict'
import {mkdir,readdir,realpath,stat,writeFile} from 'node:fs/promises'
import {basename,join,relative,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {randomUUID} from 'node:crypto'
import {Workspaces} from '../desktop/service/workspaces'
import {prisma} from '../src/lib/db'
import {DraftJournal} from '../desktop/main/draft-journal'
import {defaultState,stateSchema} from '../desktop/core/settings'
import {workspaceTabSchema} from '../src/lib/desktop/workspace-draft-source'
import type {CharacterRoleType,ChapterStatus} from '../src/generated/prisma/enums'

// Valid local 1px PNG, generated and decoded with the installed sharp runtime.
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVR4nGOYuGwBAAOjAdgqqzKVAAAAAElFTkSuQmCC'
async function main(){
 const emptyFullscreen=process.argv[3]==='--empty-fullscreen'
 assert(process.argv[3]===undefined||emptyFullscreen,'Unknown fixture mode')
 const directory=await realpath(resolve(process.argv[2]??'')),temporary=await realpath(tmpdir())
 const inside=relative(temporary,directory)
 assert(inside&&!inside.startsWith('..')&&!inside.includes(':')&&basename(directory).startsWith('shakeink-sidebar-'),'Fresh canonical shakeink-sidebar-* temporary directory required')
 assert.deepEqual(await readdir(directory),[],'Fixture root must be empty before seed')
 const root=join(directory,'data'),works=new Workspaces(root,resolve('prisma/migrations'))
 const fixture:{version:1;synthetic:true;works:any[];unbound:any;activeTabId?:string|null;tabs?:any[];statuses:ChapterStatus[];image:string;emptyFullscreen:boolean}={version:1,synthetic:true,works:[],unbound:null,statuses:['OUTLINE','REVIEWED','WRITTEN','CHAPTER_REVIEWED','FINAL'],image:pixel,emptyFullscreen}
 try{
  await works.initialize()
  for(let workIndex=0;workIndex<2;workIndex++){
   const path=join(directory,'work-'+workIndex);await mkdir(path)
   const identity=await stat(path,{bigint:true})
   const title=workIndex===0?'雨灯纪事 · 用于真实导航渐隐验收的长作品名称 English words remain on one line':'风渡行记'
   const work=await works.create({path,device:String(identity.dev),inode:String(identity.ino)},{title,requestId:randomUUID()})
   const records=await works.run(work.id,async()=>{
    if(workIndex===1)await prisma.novel.update({where:{id:work.novelId},data:{coverUrl:pixel}})
    const names=workIndex===0?['林舟','周宁','段离','名字比较长用于实际淡出和角色徽标保留测试 English Words']:['沈岚','许青','赵岩','另一个比较长的合成角色名称 English Words']
    const roles:CharacterRoleType[]=['PROTAGONIST','SUPPORTING','ANTAGONIST','SUPPORTING']
    const characters=[]
    for(let index=0;index<names.length;index++)characters.push(await prisma.character.create({data:{novelId:work.novelId,name:names[index],roleType:roles[index],age:'20',occupation:'隔离合成角色',personality:'谨慎',appearance:'合成验收资料',clothing:'普通衣着',catchphrase:'',growthArc:'测试角色成长弧线',relationships:[],extra:{},avatarUrl:index===1?pixel:null}}))
    const foreshadow=await prisma.foreshadowCharacter.create({data:{novelId:work.novelId,name:workIndex===0?'过客':'候舟',note:'仅用于隔离导航验收'}})
    const world=await prisma.world.create({data:{novelId:work.novelId,name:workIndex===0?'雨灯界':'风渡界',description:'合成世界记录'}})
    const childWorld=await prisma.world.create({data:{novelId:work.novelId,parentId:world.id,name:'小世界',description:'合成子世界记录'}})
    await prisma.setting.createMany({data:[{novelId:work.novelId,type:'STYLE',name:'叙述方式',content:{description:'合成文风'}},{novelId:work.novelId,type:'GOLD_FINGER',name:'回声指引',content:{description:'合成金手指'}}]})
    const scene=await prisma.scene.create({data:{novelId:work.novelId,name:workIndex===0?'雨夜客栈':'山口驿站',description:'隔离场景说明'}})
    const childScene=await prisma.scene.create({data:{novelId:work.novelId,parentId:scene.id,name:'内院',description:'隔离子场景'}})
    const labs=[]
    for(let index=0;index<2;index++)labs.push(await prisma.scenarioLab.create({data:{novelId:work.novelId,title:(workIndex===0?'雨灯':'风渡')+'试验场'+(index+1),cast:[{characterId:characters[0].id,name:characters[0].name,control:'ai'}],sceneIds:[scene.id],premise:'仅用于隔离验收，不进行模型推演',status:'draft'}}))
    const volumes=[]
    // The second real work intentionally has no manuscript, for the empty
    // view and independent root menu. Its characters/scenes/labs remain real.
    if(workIndex===0){
     for(let volumeIndex=1;volumeIndex<=2;volumeIndex++){
      const volume=await prisma.volume.create({data:{novelId:work.novelId,index:volumeIndex,title:volumeIndex===1?'起程':'归来',summary:'隔离卷摘要'}})
      const chapters=[]
      for(let index=1;index<=(volumeIndex===1?5:22);index++)chapters.push(await prisma.chapter.create({data:{volumeId:volume.id,index,title:volumeIndex===1&&index===1?'出发':volumeIndex===1&&index===2?'用于正文渐隐验证的长章节名称 English mixed words remain on one line':'隔离章'+index,outline:'隔离合成大纲',content:'# 隔离合成正文\n\n此内容只存在于临时测试作品。\n\n第二段用于真实编辑器实例和草稿保留验收。',status:volumeIndex===1?fixture.statuses[index-1]:'WRITTEN',wordCount:40}}))
      volumes.push({...volume,chapters})
     }
    }
    const conversation=await prisma.conversation.create({data:{userId:'local-author',novelId:work.novelId,title:workIndex===0?'雨灯创作对话':'风渡创作对话'}})
    await prisma.message.create({data:{conversationId:conversation.id,role:'USER',content:'隔离合成用户消息：继续讨论作品。'}})
    await prisma.message.create({data:{conversationId:conversation.id,role:'ASSISTANT',content:'隔离合成回复，未调用模型。'}})
    return{characters,foreshadow,world,childWorld,scene,childScene,labs,volumes,conversation}
   })
   fixture.works.push({workId:work.id,novelId:work.novelId,title,cover:workIndex===1,...records})
  }
  fixture.unbound=await works.run('inbox',async()=>{
   const conversation=await prisma.conversation.create({data:{userId:'local-author',title:'未绑定创作指引对话'}})
   await prisma.message.create({data:{conversationId:conversation.id,role:'USER',content:'隔离合成脑洞，不绑定作品。'}})
   return conversation
  })
  const first=fixture.works[0],chapter=first.volumes[0].chapters[0]
  const tabs=emptyFullscreen?[]:[workspaceTabSchema.parse({id:'chapter-content:'+chapter.id,type:'chapter-content',novelId:first.novelId,refId:chapter.id,title:chapter.title}),workspaceTabSchema.parse({id:'theme:'+first.novelId,type:'theme',novelId:first.novelId,title:'主题'})]
  fixture.tabs=tabs;fixture.activeTabId=tabs[0]?.id??null
  const journal=new DraftJournal(root),release=journal.activate('sidebar-navigation-fixture')
  try{await journal.persist('sidebar-navigation-fixture',{version:1,revision:1,createdAt:new Date().toISOString(),autosaves:[],issues:[],sources:{workspace:{version:1,tabs,activeTabId:fixture.activeTabId,subTabs:{},layout:emptyFullscreen?{version:1,narrowPane:'content',contentVisible:true,sidebarVisible:false,chatVisible:false,sizes:{sidebar:0,chat:0,content:100},lastContentSize:80,lastSidebarSize:20,lastChatSize:30}:{version:1,narrowPane:'sidebar',contentVisible:true,sidebarVisible:true,chatVisible:true,sizes:{sidebar:20,chat:30,content:50},lastContentSize:50,lastSidebarSize:20,lastChatSize:30}}}})}finally{release()}
 }finally{await works.close()}
 const state=structuredClone(defaultState)
 state.settings.user={penName:'隔离导航作者',email:'sidebar@example.invalid',avatarAssetId:null}
 state.settings.appearance.theme='ink'
 state.onboarding={version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
 stateSchema.parse(state)
 await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state})+'\n')
 await writeFile(join(directory,'fixture.json'),JSON.stringify(fixture,null,2)+'\n')
 console.log('Sidebar fixture ready: 2 real work databases, 8 formal + 2 foreshadow characters, 27 chapters with all 5 statuses, scenes/labs/bound and inbox conversations, zero models.')
}
void main().catch(error=>{console.error(error);process.exitCode=1})
