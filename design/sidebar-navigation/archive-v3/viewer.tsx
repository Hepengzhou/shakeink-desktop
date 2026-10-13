// Synthetic offline review fixture. Never imported into installed product code.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, ChartNoAxesGantt, ChevronRight, ClipboardCheck, Download, FileText, Flag, FlaskConical, Ghost, Globe, Heart, Lightbulb, ListTree, Loader2, MapPin, MessageCirclePlus, MessageSquare, MoreHorizontal, NotebookPen, Package, Palette, PanelLeft, Pencil, Plus, RefreshCw, Settings, Settings2, Trash2, UserRound, Users, Workflow, X, type LucideIcon } from 'lucide-react'

function Label({text,className='',testId}:{text:string;className?:string;testId?:string}) {
  const ref=useRef<HTMLSpanElement>(null)
  useEffect(()=>{
    const el=ref.current!;let frame=0
    const measure=()=>{frame=0;el.dataset.overflow=String(el.scrollWidth>el.clientWidth+1)}
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure)}
    const observer=new ResizeObserver(schedule);observer.observe(el);schedule()
    document.fonts.addEventListener('loadingdone',schedule)
    return()=>{observer.disconnect();cancelAnimationFrame(frame);document.fonts.removeEventListener('loadingdone',schedule)}
  },[text])
  return <span ref={ref} className={`nav-label ${className}`} title={text} data-testid={testId}>{text}</span>
}
type FixtureNode={id:string;label:string;icon:LucideIcon;children?:FixtureNode[];tag?:string;action?:'create-scenario';dimmed?:boolean;kind?:string}
const firstWork:FixtureNode={id:'novel',label:'雨灯纪事',icon:BookOpen,children:[
  {id:'settings',label:'设定',icon:Settings2,children:[{id:'theme',label:'主题',icon:Lightbulb},{id:'style',label:'文风',icon:Pencil},{id:'worlds',label:'世界观',icon:Globe,children:[{id:'world',label:'青石城',icon:Globe}]},{id:'gift',label:'金手指',icon:Lightbulb},{id:'foreshadow',label:'伏笔',icon:Flag},{id:'trope',label:'爽点/泪点',icon:Heart}]},
  {id:'characters',label:'角色',icon:Users,children:[{id:'protagonists',label:'主角（1）',icon:Users,children:[{id:'character',label:'林舟',icon:UserRound,tag:'主'}]},{id:'supporting',label:'配角（2）',icon:Users,children:[{id:'support1',label:'顾雨',icon:UserRound},{id:'support2',label:'苏禾',icon:UserRound}]},{id:'antagonists',label:'反派（1）',icon:Users,children:[{id:'antagonist',label:'江临',icon:UserRound}]},{id:'foreshadow-characters',label:'伏笔角色（1）',icon:Ghost,children:[{id:'mystery',label:'渡船客',icon:Ghost,tag:'伏笔'}]}]},
  {id:'items',label:'物品',icon:Package},{id:'scenario',label:'情景试验场',icon:FlaskConical,action:'create-scenario'},
  {id:'scenes',label:'场景',icon:MapPin},
  {id:'worldline',label:'世界线',icon:ChartNoAxesGantt},{id:'narrative',label:'叙事线',icon:ListTree},{id:'outline',label:'大纲',icon:ListTree},{id:'body',label:'正文',icon:FileText,children:[{id:'volume',label:'第一卷 · 雨灯',icon:FileText,children:[{id:'chapter',label:'第一章 · 雨灯',icon:FileText},{id:'chapter-next',label:'第二章 · 长街',icon:FileText}]}]},
  {id:'workflow',label:'创作进度',icon:Workflow},{id:'review',label:'创作评审',icon:ClipboardCheck},{id:'cascade',label:'级联修订',icon:RefreshCw},{id:'conversations',label:'对话',icon:MessageSquare,children:[{id:'conversation',label:'我想从一场雨夜开始这个故事',icon:MessageSquare}]}]}
const secondNames:Record<string,string>={novel:'风渡行记',world:'风渡山',character:'宋遥',support1:'温宁',support2:'明溪',antagonist:'秦川',mystery:'持伞人',volume:'第一卷 · 风起',chapter:'第一章 · 山路', 'chapter-next':'第二章 · 归途',conversation:'讨论风渡山的开篇与人物动机'}
function secondNode(node:FixtureNode):FixtureNode{return {...node,id:`${node.id}-2`,label:secondNames[node.id]??node.label,children:node.children?.map(secondNode)}}
const baseNodes=[firstWork,secondNode(firstWork)]
const unbound:FixtureNode={id:'unbound',label:'小说创作指引（1）',icon:Lightbulb,children:[{id:'unbound-conversation',label:'讨论一个尚未建档的脑洞',icon:MessageSquare,kind:'conversation'}]}
const longNames:Record<string,string>={novel:'雨灯纪事：一部跨越山海与旧城的长篇幻想小说','novel-2':'风渡行记：穿过群山与古城的第二部长篇作品',world:'青石城及其外海群岛与旧王朝的世界设定',character:'林舟与长夜行船者的另一重身份',mystery:'尚未揭晓身份的雨夜渡船客',chapter:'第一章 · 雨灯长明与旅人尚未说出口的约定','chapter-2':'第一章 · 穿过旧山路与未曾停息的风',conversation:'我想从一场雨夜开始这个故事，并讨论长篇作品的角色关系与主线走向','conversation-2':'讨论风渡山的开篇与各个人物在长篇作品中的动机和成长','unbound-conversation':'尚未建档的很长一段脑洞讨论及关于人物成长的补充思考'}
const categories=[{id:'works',label:'作品'},{id:'settings',label:'设定'},{id:'characters',label:'角色'},{id:'manuscript',label:'正文'},{id:'conversations',label:'对话'}] as const
type View=typeof categories[number]['id']
const kindMap:Record<string,string>={novel:'work',settings:'group',theme:'setting',style:'setting',worlds:'world',world:'world',gift:'setting',foreshadow:'setting',trope:'setting',characters:'group',protagonists:'group',supporting:'group',antagonists:'group','foreshadow-characters':'group',character:'character',support1:'character',support2:'character',antagonist:'character',mystery:'character',scenes:'scenes',scenario:'scenario',body:'group',volume:'volume',chapter:'chapter','chapter-next':'chapter',conversations:'group',conversation:'conversation'}
const nodeKind=(node:FixtureNode)=>node.kind??kindMap[node.id.replace(/-2$/,'')]??'business'

function ManuscriptActions({workName,onAction}:{workName:string;onAction:(action:string)=>void}){
  const [open,setOpen]=useState(false),[anchor,setAnchor]=useState({left:0,top:0}),box=useRef<HTMLSpanElement>(null),trigger=useRef<HTMLButtonElement>(null)
  useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>box.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());const outside=(event:PointerEvent)=>{if(!box.current?.contains(event.target as Node))setOpen(false)},close=()=>setOpen(false);document.addEventListener('pointerdown',outside);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close)}},[open])
  return <span ref={box} className="group-menu-box" onKeyDown={event=>{if(open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus()}}}><button ref={trigger} className="group-menu-trigger" aria-label={`${workName}正文导航功能菜单`} aria-haspopup="menu" aria-expanded={open} onClick={()=>{const rect=trigger.current!.getBoundingClientRect();setAnchor({left:Math.min(Math.max(8,rect.right-176),window.innerWidth-184),top:rect.bottom+116<window.innerHeight?rect.bottom+4:Math.max(8,rect.top-112)});setOpen(old=>!old)}}><MoreHorizontal/></button>{open&&<span className="group-menu" style={anchor} role="menu" aria-label={`${workName}正文导航功能`} onKeyDown={event=>{const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus()}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus()}}}>{[['添加卷',Plus],['导出整书正文',Download],['删除全部卷章',Trash2]].map(([text,Icon])=><button key={text as string} role="menuitem" onClick={()=>{onAction(text as string);setOpen(false);trigger.current?.focus()}}>{React.createElement(Icon as LucideIcon)}{text as string}</button>)}</span>}</span>
}
type Scenario={id:string;title:string}
type Mode='normal'|'long'|'category-empty'|'character-error'|'empty'|'loading'|'error'
type DialogView={kind:'library'}|{kind:'create';origin:'direct'|'library'}|{kind:'rename'|'delete';id:string}
const fixtureScenarios:Scenario[]=[{id:'trial-1',title:'雨夜重逢：检验角色的不同选择'},{id:'trial-2',title:'长街上的一次意外对话'}]

function App(){
  const [theme,setTheme]=useState('ink'),[width,setWidth]=useState(260),[height,setHeight]=useState(900),[mode,setMode]=useState<Mode>('normal')
  const [view,setView]=useState<View>('works')
  const [expandedByView,setExpandedByView]=useState<Record<View,Set<string>>>(()=>Object.fromEntries(categories.map(({id})=>[id,new Set(['novel','settings','worlds','worlds-2','characters','protagonists','body','volume','volume-2','conversations','unbound'])])) as Record<View,Set<string>>)
  const expanded=expandedByView[view]
  const treeRef=useRef<HTMLDivElement>(null),scrollPositions=useRef<Record<View,number>>({works:0,settings:0,characters:0,manuscript:0,conversations:0})
  const [active,setActive]=useState('worldline'),[newConversation,setNewConversation]=useState(true),[accountOpen,setAccountOpen]=useState(false),[message,setMessage]=useState('请查看创建入口、长名称末端与底部账户区。')
  const [dialogView,setDialogView]=useState<DialogView|null>(null),[listState,setListState]=useState('populated'),[scenarioOwner,setScenarioOwner]=useState('novel'),[scenariosByWork,setScenariosByWork]=useState<Record<string,Scenario[]>>({novel:fixtureScenarios,'novel-2':[{id:'trial-3',title:'山路相遇：检验开篇的不同选择'}]}),[draft,setDraft]=useState(''),[moreId,setMoreId]=useState<string|null>(null)
  const scenarios=scenariosByWork[scenarioOwner]??[]
  const setScenarios=(update:(old:Scenario[])=>Scenario[])=>setScenariosByWork(old=>({...old,[scenarioOwner]:update(old[scenarioOwner]??[])}))
  const syntheticCounter=useRef(0)
  const dialog=useRef<HTMLDialogElement>(null),dialogOrigin=useRef<HTMLElement|null>(null),dialogFocus=useRef<string|null>(null),accountRef=useRef<HTMLButtonElement>(null),accountBox=useRef<HTMLDivElement>(null)
  useEffect(()=>{document.documentElement.className=theme},[theme])
  useEffect(()=>{
    const onPointer=(event:PointerEvent)=>{if(accountOpen&&!accountBox.current?.contains(event.target as Node))setAccountOpen(false)}
    document.addEventListener('pointerdown',onPointer);return()=>document.removeEventListener('pointerdown',onPointer)
  },[accountOpen])
  useEffect(()=>{
    if(!dialogView){if(dialog.current?.open)dialog.current.close();dialogOrigin.current?.focus();return}
    if(!dialog.current!.open)dialog.current!.showModal()
    const frame=requestAnimationFrame(()=>{
      const focus=dialogFocus.current?dialog.current?.querySelector<HTMLElement>(`[data-focus="${dialogFocus.current}"]`):null
      dialogFocus.current=null
      ;(focus??dialog.current?.querySelector<HTMLElement>(dialogView.kind==='library'?'[data-focus="new-scenario"]':'input, [data-focus="cancel"]'))?.focus()
    })
    return()=>cancelAnimationFrame(frame)
  },[dialogView])
  useLayoutEffect(()=>{if(treeRef.current)treeRef.current.scrollTop=scrollPositions.current[view]},[view])
  const chooseView=(next:View)=>{if(next===view)return;if(treeRef.current)scrollPositions.current[view]=treeRef.current.scrollTop;setAccountOpen(false);setView(next)}
  const toggle=(id:string)=>setExpandedByView(old=>{const next=new Set(old[view]);next.has(id)?next.delete(id):next.add(id);return {...old,[view]:next}})
  const launch=(next:DialogView,trigger:HTMLElement,owner='novel')=>{setAccountOpen(false);setMoreId(null);setScenarioOwner(owner);dialogOrigin.current=trigger;setDraft('');setDialogView(next)}
  const returnToLibrary=(focus='new-scenario')=>{setMoreId(null);dialogFocus.current=focus;setDialogView({kind:'library'})}
  const cancel=()=>{if(dialogView?.kind==='library'||(dialogView?.kind==='create'&&dialogView.origin==='direct'))setDialogView(null);else returnToLibrary(dialogView?.kind==='rename'||dialogView?.kind==='delete'?`open-${dialogView.id}`:'new-scenario')}
  const openScenario=(item:Scenario)=>{setActive(scenarioOwner==='novel'?'scenario':'scenario-2');setDialogView(null);setMessage(`示意动作：打开「${item.title}」的原情景试验场详情 Tab。`)}
  const saveOperation=()=>{
    if(!dialogView)return
    if(dialogView.kind==='create'&&draft.trim()){const item={id:`synthetic-${scenarioOwner}-${++syntheticCounter.current}`,title:draft.trim()};setScenarios(old=>[...old,item]);setListState('populated');openScenario(item)}
    if(dialogView.kind==='rename'&&draft.trim()){setScenarios(old=>old.map(item=>item.id===dialogView.id?{...item,title:draft.trim()}:item));setMessage('示意动作：列表与原详情 Tab 标题同步更新。');returnToLibrary(`open-${dialogView.id}`)}
    if(dialogView.kind==='delete'){setScenarios(old=>old.filter(item=>item.id!==dialogView.id));setMessage('示意动作：删除合成试验场并关闭对应详情 Tab。');returnToLibrary('new-scenario')}
  }
  const nodeLabel=(node:FixtureNode)=>mode==='long'?(longNames[node.id]??node.label):node.label
  const renderNode=(node:FixtureNode,depth=0,owner='novel'):React.ReactNode=><React.Fragment key={node.id}>
    <div className={`tree-row ${active===node.id?'active':''} ${node.dimmed?'dimmed':''}`} data-node={node.id} data-kind={nodeKind(node)} data-work={owner} style={{paddingLeft:depth*14+6}}>
      {node.children?<button className="row-toggle" aria-label={`${expanded.has(node.id)?'收起':'展开'}${nodeLabel(node)}`} aria-expanded={expanded.has(node.id)} onClick={()=>toggle(node.id)}><ChevronRight/></button>:<span className="row-spacer"/>}
      <button className="row-main" aria-label={nodeLabel(node)} onClick={event=>{
        if(nodeKind(node)==='scenario')launch({kind:'library'},event.currentTarget,owner)
        else {if(nodeKind(node)==='work'&&!expanded.has(node.id))toggle(node.id);setActive(node.id);setMessage(nodeKind(node)==='scenes'?`示意动作：打开「${nodeLabel(baseNodes.find(work=>work.id===owner)!)}」的原场景面板。`:`示意选中：${nodeLabel(node)}`)}
      }}><node.icon/><Label text={nodeLabel(node)} testId={`label-${node.id}`}/></button>
      {node.tag&&<span className="role-tag">{node.tag}</span>}
      {node.action&&<button className="row-action" aria-label="新建情景试验场" title="新建情景试验场" onClick={event=>launch({kind:'create',origin:'direct'},event.currentTarget,owner)}><Plus/></button>}
    </div>
    {node.children&&expanded.has(node.id)&&node.children.map(child=>renderNode(child,depth+1,owner))}
  </React.Fragment>
  const groupEmpty:Record<View,string>={works:'还没有小说',settings:'暂无设定项目',characters:'暂无角色',manuscript:'暂无正文',conversations:'暂无对话'}
  const unavailable=<div className="unavailable-work"><div className="unavailable-title"><AlertCircle/><Label text="目录暂不可用的很长作品名称与补充说明" testId="unavailable-title"/></div><p>作品目录暂不可用，请检查目录后重新加载。</p></div>
  const renderFiltered=(work:FixtureNode)=>{
    const source=work.children?.find(node=>node.id===`${view==='manuscript'?'body':view}${work.id==='novel-2'?'-2':''}`)
    let nodes=source?.children??[]
    if(view==='characters'){const badges:Record<string,string>={protagonists:'主',supporting:'配',antagonists:'反','foreshadow-characters':'伏笔'};nodes=nodes.flatMap(group=>(group.children??[]).map(node=>({...node,tag:badges[group.id.replace(/-2$/,'')]})))}
    if(mode==='category-empty'&&view!=='settings')nodes=[]
    const characterError=mode==='character-error'&&view==='characters'&&work.id==='novel'
    if(characterError)nodes=nodes.filter(node=>node.id!=='mystery')
    return <section className="nav-work-group" key={work.id} data-group={work.id}><div className="nav-group-heading"><BookOpen/><Label text={nodeLabel(work)} testId={`group-${work.id}`}/>{view==='manuscript'&&<ManuscriptActions workName={nodeLabel(work)} onAction={action=>setMessage(`示意动作：「${nodeLabel(work)}」${action}，沿用原正文导航菜单。`)}/>}</div>{nodes.length?nodes.map(node=>renderNode(node,0,work.id)):!characterError&&<p className="category-empty">{groupEmpty[view]}</p>}{characterError&&<div className="category-error" role="alert"><p>伏笔角色加载失败</p><button className="retry" onClick={()=>setMode('normal')}>重试伏笔角色</button></div>}</section>
  }
  const renderNavigation=()=>{
    const showUnbound=view==='works'||view==='conversations'
    return <>{showUnbound&&(view==='works'?renderNode(unbound,0,'unbound'):<section className="nav-work-group" data-group="unbound"><div className="nav-group-heading"><Lightbulb/><Label text="小说创作指引"/></div>{unbound.children!.map(node=>renderNode({...node,label:nodeLabel(node)},0,'unbound'))}</section>)}
      {mode==='empty'?<div className="empty-state"><BookOpen/><p>还没有小说<br/>点击上方「创建作品」开始你的第一部作品吧</p></div>:mode==='loading'?<div className="empty-state" role="status"><Loader2/><p>正在加载作品</p></div>:mode==='error'?<div className="empty-state" role="alert"><AlertCircle/><p>作品加载失败<br/>暂时无法获取作品列表，请稍后重试。</p><button className="retry" onClick={()=>setMode('normal')}>重新加载作品</button></div>:<>{mode==='long'&&unavailable}{view==='works'?baseNodes.map(work=>renderNode(work,0,work.id)):baseNodes.map(renderFiltered)}</>}
    </>
  }
  const name=mode==='long'?'这是一个用来审核渐隐效果的很长的示意用户名称':'示意用户'
  const email=mode==='long'?'long.review.account.name@example.invalid':'review@example.invalid'
  const profile=<><span className="avatar">示</span><span className="account-text"><Label text={name} className="account-name"/><Label text={email} className="account-email"/></span></>
  const menuKey=(event:React.KeyboardEvent<HTMLElement>,selector:string,onEscape:()=>void)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onEscape();return}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return
    event.preventDefault();const items=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(selector));const index=items.indexOf(document.activeElement as HTMLButtonElement)
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus()
  }
  return <>
    <header className="review-header"><div className="eyebrow">XAANINK / DESIGN REVIEW / 2026.10.13</div><h1>让导航多一点呼吸</h1><p>左侧导航设计 v3 · 等待 UI 审核 · 所有作品、人物、对话和账户均为合成示意数据</p><nav className="review-links"><a href="research.md">01 调研文档</a><a href="product-design.md">02 产品设计</a><a href="technical-plan.md">技术方案</a></nav></header>
    <div className="controls" aria-label="设计审核工具">
      <div className="control-group"><span className="control-label">主题</span><div className="segments">{[['ink','玄墨'],['paper','宣纸']].map(([value,label])=><button key={value} aria-pressed={theme===value} onClick={()=>setTheme(value)}>{label}</button>)}</div></div>
      <div className="control-group"><label className="control-label" htmlFor="width">栏宽</label><select id="width" value={width} onChange={event=>setWidth(Number(event.target.value))}>{[200,260,420].map(value=><option key={value} value={value}>{value}px</option>)}</select></div>
      <div className="control-group"><label className="control-label" htmlFor="height">窗口高度</label><select id="height" value={height} onChange={event=>setHeight(Number(event.target.value))}>{[900,640,500].map(value=><option key={value} value={value}>{value}px</option>)}</select></div>
      <div className="control-group"><label className="control-label" htmlFor="state">内容</label><select id="state" value={mode} onChange={event=>{setMode(event.target.value as Mode);setAccountOpen(false)}}><option value="normal">普通名称</option><option value="long">长名称</option><option value="category-empty">分类空列表</option><option value="character-error">伏笔角色加载失败</option><option value="empty">空作品</option><option value="loading">加载中</option><option value="error">加载失败</option></select></div>
    </div>
    <main className="review-main"><section className="stage-wrap"><div className="stage-caption"><span>左侧导航 · 100% 逻辑尺寸</span><span>{width} × {height}px</span></div><div className="stage">
      <aside className="sidebar" style={{width,height}} aria-label="左侧导航设计示意">
        <div className="window-controls" aria-label="桌面控制示意"><button disabled aria-label="后退"><ArrowLeft/></button><button disabled aria-label="前进"><ArrowRight/></button><button disabled aria-label="收起导航"><PanelLeft/></button></div>
        <div className="create-actions"><button className="create-action" data-icon="NotebookPen" onClick={()=>setMessage('示意动作：打开现有创建作品向导。')}><NotebookPen/><Label text="创建作品"/></button><button className={`create-action ${newConversation?'active':''}`} data-icon="MessageCirclePlus" onClick={()=>{setNewConversation(true);setMessage('示意动作：准备一条新对话，沿用现有新对话选中态。')}}><MessageCirclePlus/><Label text="新对话"/></button></div>
        <div className="nav-tabs" role="tablist" aria-label="导航分类">{categories.map((category,index)=><button id={`nav-tab-${category.id}`} key={category.id} className="nav-tab" role="tab" aria-selected={view===category.id} aria-controls="sidebar-panel" tabIndex={view===category.id?0:-1} onClick={()=>chooseView(category.id)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?categories.length-1:(index+(event.key==='ArrowRight'?1:-1)+categories.length)%categories.length;chooseView(categories[next].id);document.getElementById(`nav-tab-${categories[next].id}`)?.focus()}}><Label text={category.label}/></button>)}</div>
        <div className="tree-scroll" id="sidebar-panel" ref={treeRef} role="tabpanel" aria-labelledby={`nav-tab-${view}`} data-view={view} onScroll={event=>{scrollPositions.current[view]=event.currentTarget.scrollTop}}>
          {renderNavigation()}
        </div>
        <div className="account-footer" ref={accountBox}>
          <button className="account-button" ref={accountRef} aria-label={`账号菜单：${name}，${email}`} aria-expanded={accountOpen} aria-haspopup="menu" onClick={()=>{setAccountOpen(old=>!old);requestAnimationFrame(()=>accountBox.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus())}}>{profile}</button>
          {accountOpen&&<div className="account-menu" role="menu" aria-label="账号菜单" onKeyDown={event=>menuKey(event,'[role="menuitem"]',()=>{setAccountOpen(false);accountRef.current?.focus()})}><div className="menu-profile">{profile}</div><button role="menuitem" onClick={()=>{setTheme(theme==='ink'?'paper':'ink');setAccountOpen(false);accountRef.current?.focus()}}><Palette/>外观<span className="theme-name">{theme==='ink'?'玄墨':'宣纸'}</span></button><button role="menuitem" onClick={()=>{setAccountOpen(false);setMessage('示意动作：打开现有设置。')}}><Settings/>设置</button><button role="menuitem" onClick={()=>{setAccountOpen(false);setMessage('示意动作：打开现有用户资料编辑。')}}><UserRound/>编辑资料</button></div>}
        </div>
      </aside>
    </div><p className="bottom-note">滚动树区可查看其余业务入口。顶部创建入口和底部账户区固定；原型控件只操作当前页面内的示意状态。</p></section>
    <aside className="notes"><h2>按内容切换导航</h2><p>五个分类覆盖所有作品，条目按作品分组，方便集中查看和定位。</p>
      <div className="spec"><span className="spec-index">01 / 创建入口</span><h3>新对话，使用气泡内加号图标</h3><p>采用 14px 字号和 20px 行高，图标与文字垂直居中。「新对话」图标按本次参考图改为圆形气泡内加号。</p><div className="measurements"><div><b>32</b><span>每行高度 / px</span></div><div><b>4</b><span>两行间距 / px</span></div><div><b>14</b><span>文字字号 / px</span></div></div></div>
      <div className="spec"><span className="spec-index">02 / 名称渐隐</span><h3>与右侧 Tabs 使用同一种结尾</h3><p>只有文字超出可用宽度时，末端 24px 才逐渐淡出。图标、角色标记和操作按钮保留完整显示。悬停文字可查看全名。</p><div className="tab-demo" aria-label="右侧 Tabs 渐隐对照示意"><div className="tab-example"><FileText/><Label text="第一章 · 雨灯长明与旅人的约定"/><X className="tab-close"/></div></div></div>
      <div className="spec"><span className="spec-index">03 / 五项分类</span><h3>作品 · 设定 · 角色 · 正文 · 对话</h3><p>作品展示完整导航；设定只列设定项目，角色平铺人物，正文按卷章展开，对话展示历史会话。每一项都覆盖所有作品，未建档对话也可查看。正文分组右侧保留整书功能菜单。</p></div>
      <div className="spec"><span className="spec-index">04 / 入口整理</span><h3>场景与情景试验场保持单行</h3><p>场景点击打开原场景面板；试验场点击打开管理弹窗。两者均不在导航展开子项，属性入口移除。</p></div>
      <div className="spec"><span className="spec-index">05 / 底部用户区</span><h3>让头像与资料有足够留白</h3><p>增加整行点击区域，姓名和邮箱随实际内容显示，长名称同样渐隐。</p><div className="measurements"><div><b>72</b><span>底栏高度 / px</span></div><div><b>52</b><span>按钮高度 / px</span></div><div><b>32</b><span>头像尺寸 / px</span></div></div></div>
      <div className="review-message" role="status"><strong>当前示意动作</strong>{message}</div>
    </aside></main>
    <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event=>{event.preventDefault();cancel()}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)cancel()}}}>
      <div className="dialog-heading"><h2 id="dialog-title">{dialogView?.kind==='library'?'情景试验场':dialogView?.kind==='create'?'新建情景试验场':dialogView?.kind==='rename'?'重命名情景试验场':'删除情景试验场'}</h2><button className="dialog-close" aria-label="关闭弹窗" onClick={cancel}><X/></button></div>
      <p className="dialog-description">{nodeLabel(baseNodes.find(work=>work.id===scenarioOwner)!)} · 合成设计示意</p>
      {dialogView?.kind==='library'?<>
        <div className="dialog-toolbar"><button className="primary-button" data-focus="new-scenario" onClick={()=>{setDraft('');setDialogView({kind:'create',origin:'library'})}}><Plus/>新建情景试验场</button><select aria-label="试验场示意状态" value={listState} onChange={event=>{setListState(event.target.value);setMoreId(null)}}><option value="populated">有记录</option><option value="empty">空列表</option><option value="loading">加载中</option><option value="error">加载失败</option></select></div>
        <div className="library-body">{listState==='loading'?<div className="empty-state" role="status"><Loader2/><p>正在加载试验场</p></div>:listState==='error'?<div className="empty-state" role="alert"><AlertCircle/><p>加载情景试验场失败</p><button className="retry" onClick={()=>setListState('populated')}>重试</button></div>:listState==='empty'||scenarios.length===0?<div className="empty-state"><FlaskConical/><p>暂无试验场</p></div>:<ul className="scenario-list">{scenarios.map(item=><li key={item.id}><div className="scenario-item"><button className="scenario-open" data-focus={`open-${item.id}`} onClick={()=>openScenario(item)}><FlaskConical/><span className="scenario-title" title={item.title}>{item.title}</span></button><div className="more-wrap"><button className="scenario-more" aria-label={`试验场操作：${item.title}`} aria-expanded={moreId===item.id} aria-haspopup="menu" onClick={()=>{setMoreId(moreId===item.id?null:item.id);requestAnimationFrame(()=>dialog.current?.querySelector<HTMLButtonElement>('.item-menu button')?.focus())}}><MoreHorizontal/></button>{moreId===item.id&&<div className="item-menu" role="menu" aria-label="试验场操作" onKeyDown={event=>menuKey(event,'button',()=>{setMoreId(null);event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.scenario-more')?.focus()})}><button role="menuitem" onClick={()=>{setDraft(item.title);setMoreId(null);setDialogView({kind:'rename',id:item.id})}}><Pencil/>重命名</button><button role="menuitem" onClick={()=>{setMoreId(null);setDialogView({kind:'delete',id:item.id})}}><Trash2/>删除</button></div>}</div></div></li>)}</ul>}</div>
        <p className="dialog-footnote">记录仅在管理弹窗中展示，左侧导航不会出现子项。加载状态切换仅供审核。</p>
      </>:dialogView&&<>
        {dialogView.kind==='delete'?<p className="dialog-description">确定删除「{scenarios.find(item=>item.id===dialogView.id)?.title}」？此处只删除合成示意记录；正式产品沿用原删除确认与提示。</p>:<div className="operation-form"><label htmlFor="scenario-title">名称</label><input id="scenario-title" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="填写试验场名称"/><p className="dialog-footnote">审核稿展示弹窗与返回路径；正式创建继续复用原有参演角色和配置表单。</p></div>}
        <div className="dialog-buttons"><button data-focus="cancel" onClick={cancel}>取消</button><button className="primary-button" disabled={dialogView.kind!=='delete'&&!draft.trim()} onClick={saveOperation}>{dialogView.kind==='delete'?'确认删除':dialogView.kind==='rename'?'保存':'创建'}</button></div>
      </>}
    </dialog>
  </>
}
createRoot(document.getElementById('root')!).render(<App/> )
