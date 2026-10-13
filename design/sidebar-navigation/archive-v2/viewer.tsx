// Synthetic offline review fixture. Never imported into installed product code.
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, ChartNoAxesGantt, ChevronRight, ClipboardCheck, FileText, Flag, FlaskConical, Globe, Heart, Lightbulb, ListTree, Loader2, MapPin, MessageCircle, MessageSquare, MoreHorizontal, NotebookPen, Package, Palette, PanelLeft, Pencil, Plus, RefreshCw, Settings, Settings2, Trash2, UserRound, Users, Workflow, X, type LucideIcon } from 'lucide-react'

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
type FixtureNode={id:string;label:string;icon:LucideIcon;children?:FixtureNode[];tag?:string;action?:'create-scenario';dimmed?:boolean}
const baseNodes:FixtureNode[]=[{id:'novel',label:'雨灯纪事',icon:BookOpen,children:[
  {id:'settings',label:'设定',icon:Settings2,children:[{id:'theme',label:'主题',icon:Lightbulb},{id:'style',label:'文风',icon:Pencil},{id:'worlds',label:'世界观',icon:Globe,children:[{id:'world',label:'青石城',icon:Globe}]},{id:'gift',label:'金手指',icon:Lightbulb},{id:'foreshadow',label:'伏笔',icon:Flag},{id:'trope',label:'爽点/泪点',icon:Heart}]},
  {id:'characters',label:'角色',icon:Users,children:[{id:'protagonists',label:'主角（1）',icon:Users,children:[{id:'character',label:'林舟',icon:UserRound,tag:'主'}]},{id:'supporting',label:'配角（2）',icon:Users,children:[{id:'support1',label:'顾雨',icon:UserRound},{id:'support2',label:'苏禾',icon:UserRound}]},{id:'antagonists',label:'反派（1）',icon:Users,children:[{id:'antagonist',label:'江临',icon:UserRound}]}]},
  {id:'items',label:'物品',icon:Package},{id:'scenario',label:'情景试验场',icon:FlaskConical,action:'create-scenario'},
  {id:'scenes',label:'场景',icon:MapPin,children:[{id:'scene',label:'长街',icon:MapPin},{id:'scene-parent',label:'青石码头',icon:MapPin,children:[{id:'scene-child',label:'旧渡口',icon:MapPin}]}]},
  {id:'worldline',label:'世界线',icon:ChartNoAxesGantt},{id:'narrative',label:'叙事线',icon:ListTree},{id:'outline',label:'大纲',icon:ListTree},{id:'body',label:'正文',icon:FileText,children:[{id:'chapter',label:'第一章 · 雨灯',icon:FileText}]},
  {id:'workflow',label:'创作进度',icon:Workflow},{id:'review',label:'创作评审',icon:ClipboardCheck},{id:'cascade',label:'级联修订',icon:RefreshCw},{id:'conversations',label:'对话',icon:MessageSquare,children:[{id:'conversation',label:'我想从一场雨夜开始这个故事',icon:MessageSquare}]}]}]
const longNames:Record<string,string>={novel:'雨灯纪事：一部跨越山海与旧城的长篇幻想小说',world:'青石城及其外海群岛与旧王朝的世界设定',character:'林舟与长夜行船者的另一重身份',scene:'长街尽头的灯铺与连接旧城的石桥', 'scene-child':'旧渡口西侧穿过雨幕仍可看见的第一盏灯',chapter:'第一章 · 雨灯长明与旅人尚未说出口的约定',conversation:'我想从一场雨夜开始这个故事，并讨论长篇作品的角色关系与主线走向'}
type Scenario={id:string;title:string}
type Mode='normal'|'long'|'empty'|'loading'|'error'
type DialogView={kind:'library'}|{kind:'create';origin:'direct'|'library'}|{kind:'rename'|'delete';id:string}
const fixtureScenarios:Scenario[]=[{id:'trial-1',title:'雨夜重逢：检验角色的不同选择'},{id:'trial-2',title:'长街上的一次意外对话'}]

function App(){
  const [theme,setTheme]=useState('ink'),[width,setWidth]=useState(260),[height,setHeight]=useState(900),[mode,setMode]=useState<Mode>('normal')
  const [expanded,setExpanded]=useState(new Set(['novel','settings','worlds','characters','protagonists','scenes','scene-parent','body','conversations','unbound']))
  const [active,setActive]=useState('worldline'),[newConversation,setNewConversation]=useState(true),[accountOpen,setAccountOpen]=useState(false),[message,setMessage]=useState('请查看创建入口、长名称末端与底部账户区。')
  const [dialogView,setDialogView]=useState<DialogView|null>(null),[listState,setListState]=useState('populated'),[scenarios,setScenarios]=useState(fixtureScenarios),[draft,setDraft]=useState(''),[moreId,setMoreId]=useState<string|null>(null)
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
  const toggle=(id:string)=>setExpanded(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next})
  const launch=(view:DialogView,trigger:HTMLElement)=>{setAccountOpen(false);setMoreId(null);dialogOrigin.current=trigger;setDraft('');setDialogView(view)}
  const returnToLibrary=(focus='new-scenario')=>{setMoreId(null);dialogFocus.current=focus;setDialogView({kind:'library'})}
  const cancel=()=>{if(dialogView?.kind==='library'||(dialogView?.kind==='create'&&dialogView.origin==='direct'))setDialogView(null);else returnToLibrary(dialogView?.kind==='rename'||dialogView?.kind==='delete'?`open-${dialogView.id}`:'new-scenario')}
  const openScenario=(item:Scenario)=>{setActive('scenario');setDialogView(null);setMessage(`示意动作：打开「${item.title}」的原情景试验场详情 Tab。`)}
  const saveOperation=()=>{
    if(!dialogView)return
    if(dialogView.kind==='create'&&draft.trim()){const item={id:`synthetic-${scenarios.length+1}`,title:draft.trim()};setScenarios(old=>[...old,item]);setListState('populated');openScenario(item)}
    if(dialogView.kind==='rename'&&draft.trim()){setScenarios(old=>old.map(item=>item.id===dialogView.id?{...item,title:draft.trim()}:item));setMessage('示意动作：列表与原详情 Tab 标题同步更新。');returnToLibrary(`open-${dialogView.id}`)}
    if(dialogView.kind==='delete'){setScenarios(old=>old.filter(item=>item.id!==dialogView.id));setMessage('示意动作：删除合成试验场并关闭对应详情 Tab。');returnToLibrary('new-scenario')}
  }
  const nodeLabel=(node:FixtureNode)=>mode==='long'?(longNames[node.id]??node.label):node.label
  const renderNode=(node:FixtureNode,depth=0):React.ReactNode=><React.Fragment key={node.id}>
    <div className={`tree-row ${active===node.id?'active':''} ${node.dimmed?'dimmed':''}`} data-node={node.id} style={{paddingLeft:depth*14+6}}>
      {node.children?<button className="row-toggle" aria-label={`${expanded.has(node.id)?'收起':'展开'}${nodeLabel(node)}`} aria-expanded={expanded.has(node.id)} onClick={()=>toggle(node.id)}><ChevronRight/></button>:<span className="row-spacer"/>}
      <button className="row-main" aria-label={nodeLabel(node)} onClick={event=>{
        if(node.id==='scenario')launch({kind:'library'},event.currentTarget)
        else {setActive(node.id);setMessage(`示意选中：${nodeLabel(node)}`)}
      }}><node.icon/><Label text={nodeLabel(node)} testId={`label-${node.id}`}/></button>
      {node.tag&&<span className="role-tag">{node.tag}</span>}
      {node.action&&<button className="row-action" aria-label="新建情景试验场" title="新建情景试验场" onClick={event=>launch({kind:'create',origin:'direct'},event.currentTarget)}><Plus/></button>}
    </div>
    {node.children&&expanded.has(node.id)&&node.children.map(child=>renderNode(child,depth+1))}
  </React.Fragment>
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
    <header className="review-header"><div className="eyebrow">XAANINK / DESIGN REVIEW / 2026.10.13</div><h1>让导航多一点呼吸</h1><p>左侧导航设计 v2 · 等待 UI 审核 · 所有作品、人物、对话和账户均为合成示意数据</p><nav className="review-links"><a href="research.md">01 调研文档</a><a href="product-design.md">02 产品设计</a><a href="technical-plan.md">技术方案</a></nav></header>
    <div className="controls" aria-label="设计审核工具">
      <div className="control-group"><span className="control-label">主题</span><div className="segments">{[['ink','玄墨'],['paper','宣纸']].map(([value,label])=><button key={value} aria-pressed={theme===value} onClick={()=>setTheme(value)}>{label}</button>)}</div></div>
      <div className="control-group"><label className="control-label" htmlFor="width">栏宽</label><select id="width" value={width} onChange={event=>setWidth(Number(event.target.value))}>{[200,260,420].map(value=><option key={value} value={value}>{value}px</option>)}</select></div>
      <div className="control-group"><label className="control-label" htmlFor="height">窗口高度</label><select id="height" value={height} onChange={event=>setHeight(Number(event.target.value))}>{[900,640,500].map(value=><option key={value} value={value}>{value}px</option>)}</select></div>
      <div className="control-group"><label className="control-label" htmlFor="state">内容</label><select id="state" value={mode} onChange={event=>{setMode(event.target.value as Mode);setAccountOpen(false)}}><option value="normal">普通名称</option><option value="long">长名称</option><option value="empty">空作品</option><option value="loading">加载中</option><option value="error">加载失败</option></select></div>
    </div>
    <main className="review-main"><section className="stage-wrap"><div className="stage-caption"><span>左侧导航 · 100% 逻辑尺寸</span><span>{width} × {height}px</span></div><div className="stage">
      <aside className="sidebar" style={{width,height}} aria-label="左侧导航设计示意">
        <div className="window-controls" aria-label="桌面控制示意"><button disabled aria-label="后退"><ArrowLeft/></button><button disabled aria-label="前进"><ArrowRight/></button><button disabled aria-label="收起导航"><PanelLeft/></button></div>
        <div className="create-actions"><button className="create-action" data-icon="NotebookPen" onClick={()=>setMessage('示意动作：打开现有创建作品向导。')}><NotebookPen/><Label text="创建作品"/></button><button className={`create-action ${newConversation?'active':''}`} data-icon="MessageCircle" onClick={()=>{setNewConversation(true);setMessage('示意动作：准备一条新对话，沿用现有新对话选中态。')}}><MessageCircle/><Label text="创建对话"/></button></div>
        <div className="section-heading">作品阁</div>
        <div className="tree-scroll">
          {mode==='empty'?<div className="empty-state"><BookOpen/><p>还没有小说<br/>点击上方「创建作品」开始你的第一部作品吧</p></div>:mode==='loading'?<div className="empty-state" role="status"><Loader2/><p>正在加载作品</p></div>:mode==='error'?<div className="empty-state" role="alert"><AlertCircle/><p>作品加载失败<br/>暂时无法获取作品列表，请稍后重试。</p><button className="retry" onClick={()=>setMode('normal')}>重新加载作品</button></div>:<>
            {mode==='long'&&renderNode({id:'unbound',label:'小说创作指引（1）',icon:Lightbulb,children:[{id:'unbound-conversation',label:'尚未建档的很长一段脑洞讨论及关于人物成长的补充思考',icon:MessageSquare}]})}
            {mode==='long'&&<div className="unavailable-work"><div className="unavailable-title"><AlertCircle/><Label text="目录暂不可用的很长作品名称与补充说明" testId="unavailable-title"/></div><p>作品目录暂不可用，请检查目录后重新加载。</p></div>}
            {baseNodes.map(node=>renderNode(node))}
          </>}
        </div>
        <div className="account-footer" ref={accountBox}>
          <button className="account-button" ref={accountRef} aria-label={`账号菜单：${name}，${email}`} aria-expanded={accountOpen} aria-haspopup="menu" onClick={()=>{setAccountOpen(old=>!old);requestAnimationFrame(()=>accountBox.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus())}}>{profile}</button>
          {accountOpen&&<div className="account-menu" role="menu" aria-label="账号菜单" onKeyDown={event=>menuKey(event,'[role="menuitem"]',()=>{setAccountOpen(false);accountRef.current?.focus()})}><div className="menu-profile">{profile}</div><button role="menuitem" onClick={()=>{setTheme(theme==='ink'?'paper':'ink');setAccountOpen(false);accountRef.current?.focus()}}><Palette/>外观<span className="theme-name">{theme==='ink'?'玄墨':'宣纸'}</span></button><button role="menuitem" onClick={()=>{setAccountOpen(false);setMessage('示意动作：打开现有设置。')}}><Settings/>设置</button><button role="menuitem" onClick={()=>{setAccountOpen(false);setMessage('示意动作：打开现有用户资料编辑。')}}><UserRound/>编辑资料</button></div>}
        </div>
      </aside>
    </div><p className="bottom-note">滚动树区可查看其余业务入口。顶部创建入口和底部账户区固定；原型控件只操作当前页面内的示意状态。</p></section>
    <aside className="notes"><h2>熟悉的结构，更从容的间距</h2><p>保留作品树的层级、字号与原有主题，只调整你提出的五处问题。</p>
      <div className="spec"><span className="spec-index">01 / 创建入口</span><h3>参考 Codex 的紧凑单行布局</h3><p>采用 14px 字号和 20px 行高，图标与文字垂直居中。作品用「笔记本与笔」，对话用「圆形对话气泡」，图文间距 10px。</p><div className="measurements"><div><b>32</b><span>每行高度 / px</span></div><div><b>4</b><span>两行间距 / px</span></div><div><b>14</b><span>文字字号 / px</span></div></div></div>
      <div className="spec"><span className="spec-index">02 / 名称渐隐</span><h3>与右侧 Tabs 使用同一种结尾</h3><p>只有文字超出可用宽度时，末端 24px 才逐渐淡出。图标、角色标记和操作按钮保留完整显示。悬停文字可查看全名。</p><div className="tab-demo" aria-label="右侧 Tabs 渐隐对照示意"><div className="tab-example"><FileText/><Label text="第一章 · 雨灯长明与旅人的约定"/><X className="tab-close"/></div></div></div>
      <div className="spec"><span className="spec-index">03 / 入口整理</span><h3>移除属性，试验场保持一行</h3><p>情景试验场不再显示展开箭头或子项；点击进入管理弹窗，既有记录仍可打开。右侧「+」保留直接创建入口。</p></div>
      <div className="spec"><span className="spec-index">04 / 底部用户区</span><h3>让头像与资料有足够留白</h3><p>增加整行点击区域，姓名和邮箱随实际内容显示，长名称同样渐隐。</p><div className="measurements"><div><b>72</b><span>底栏高度 / px</span></div><div><b>52</b><span>按钮高度 / px</span></div><div><b>32</b><span>头像尺寸 / px</span></div></div></div>
      <div className="review-message" role="status"><strong>当前示意动作</strong>{message}</div>
    </aside></main>
    <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event=>{event.preventDefault();cancel()}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)cancel()}}}>
      <div className="dialog-heading"><h2 id="dialog-title">{dialogView?.kind==='library'?'情景试验场':dialogView?.kind==='create'?'新建情景试验场':dialogView?.kind==='rename'?'重命名情景试验场':'删除情景试验场'}</h2><button className="dialog-close" aria-label="关闭弹窗" onClick={cancel}><X/></button></div>
      <p className="dialog-description">{mode==='long'?longNames.novel:'雨灯纪事'} · 合成设计示意</p>
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
