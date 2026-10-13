import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUp, Check, ChevronDown, Copy, CornerDownLeft, FileText, MessageSquare, MessageSquareQuote, Moon, PanelRight, PencilLine, Scissors, Sun, X } from 'lucide-react'
import { MarkdownPreview } from '../../src/components/editor/MarkdownPreview'
const ReviewMarkdownPreview = React.memo(MarkdownPreview)

const excerpt = '雨停以后，街巷还留着潮意。'
const manuscript = `${excerpt}屋檐滴落最后几颗水珠，远处有人推开木门。\n\n她在桥边停下，望向雾中的渡口。船还没有来，灯却先亮了。\n\n风从水面吹来，带着草木的气息。她把那封信又折了一遍，放回袖中。`
const markdown = '# 场景笔记\n\n雨停以后，**街巷还留着潮意**。人物的迟疑可以通过动作表现。\n\n> 船还没有来，灯却先亮了。\n\n- 视角保持一致\n- 留意段落间的节奏\n\n| 线索 | 状态 |\n| --- | --- |\n| 一封未拆的信 | 留待下文 |\n\n```text\n雾中的渡口\n桥边的灯\n```'
const scenes = [ ['body','正文预览'], ['chat','AI 对话'], ['composer','AI 输入框'], ['input','普通输入框'], ['markdown','Markdown 预览'], ['readonly','只读输入框'], ['empty','无选区'], ['secret','API Key'] ] as const
type Scene = typeof scenes[number][0]
type Snapshot = { root: HTMLElement; text: string; editable: boolean; historyMenu: boolean; sensitive: boolean; start?: number; end?: number; range?: Range; html: string; value?: string }
type Popup = { x:number; y:number; snapshot:Snapshot; keyboard?:boolean }
const controls = ['引用到对话','撤销','重做','剪切','复制','粘贴','粘贴为纯文本','删除','全选']

function App() {
  const [theme,setTheme] = useState('paper'), [platform,setPlatform] = useState('win32')
  const [scene,setScene] = useState<Scene>('body'), [popup,setPopup] = useState<Popup|null>(null)
  const [clip,setClip] = useState('请保留这段描写的节奏。'), [clipSecret,setClipSecret] = useState(false), [notice,setNotice] = useState('')
  const [quoted,setQuoted] = useState(0), [selectionInfo,setSelectionInfo] = useState(excerpt)
  const composer = useRef<HTMLDivElement>(null), menu = useRef<HTMLDivElement>(null), shown = useRef(false)
  const clipRef = useRef(clip), popupRef = useRef(popup)
  clipRef.current=clip; popupRef.current=popup
  const modifier = platform==='darwin'?'⌘':'Ctrl+'

  function snapshot(root:HTMLElement):Snapshot {
    const control=root instanceof HTMLInputElement||root instanceof HTMLTextAreaElement
    const historyMenu=control||root.classList.contains('review-composer')||root.isContentEditable
    const sensitive=!!root.closest('[data-review-secret]')
    const editable=control?!root.readOnly&&!root.disabled:root.isContentEditable
    if(control) return {root,editable,historyMenu,sensitive,text:root.value.slice(root.selectionStart??0,root.selectionEnd??0),start:root.selectionStart??0,end:root.selectionEnd??0,html:root.innerHTML,value:root.value}
    const selection=window.getSelection(), range=selection?.rangeCount?selection.getRangeAt(0):null
    let text='',selectedRange:Range|undefined
    const owned=range&&root.contains(range.startContainer)&&root.contains(range.endContainer)
    if(selection&&range&&(!editable||owned)&&!range.collapsed&&range.intersectsNode(root)) {
      const content=document.createRange();content.selectNodeContents(root)
      selectedRange=range.cloneRange()
      if(selectedRange.compareBoundaryPoints(Range.START_TO_START,content)<0)selectedRange.setStart(content.startContainer,content.startOffset)
      if(selectedRange.compareBoundaryPoints(Range.END_TO_END,content)>0)selectedRange.setEnd(content.endContainer,content.endOffset)
      if(!selectedRange.collapsed) {
        if(owned)text=selection.toString()
        else {
          // Chromium paragraph selections can end in the paragraph's parent.
          // Read only this source's intersection using Selection's rendered
          // line breaks, then restore the original endpoints and direction.
          const {anchorNode,anchorOffset,focusNode,focusOffset}=selection
          try {selection.removeAllRanges();selection.addRange(selectedRange);text=selection.toString()}
          finally {if(anchorNode&&focusNode)selection.setBaseAndExtent(anchorNode,anchorOffset,focusNode,focusOffset)}
        }
      }
    }
    return {root,editable,historyMenu,sensitive,text,range:selectedRange,html:root.innerHTML}
  }
  function open(root:HTMLElement,x:number,y:number,keyboard=false) {
    const next=snapshot(root)
    setSelectionInfo(next.sensitive?'敏感字段不展示选中文字':next.text||'当前没有选中文字')
    setPopup({x:Math.max(8,Math.min(x,window.innerWidth-248)),y:Math.max(8,Math.min(y,window.innerHeight-360)),snapshot:next,keyboard})
  }
  function sourceAt(target:EventTarget|null) {
    return target instanceof Element?target.closest<HTMLElement>('[data-review-text],#body-preview [data-text-preview]'):null
  }
  function close() {setPopup(null)}

  useEffect(()=>{document.documentElement.className=theme},[theme])
  useEffect(()=>{
    function context(event:MouseEvent) {
      const root=sourceAt(event.target);if(!root)return
      event.preventDefault();event.stopPropagation();open(root,event.clientX,event.clientY)
    }
    function down(event:PointerEvent) {if(menu.current?.contains(event.target as Node))return;setPopup(null)}
    function key(event:KeyboardEvent) {
      if(event.key==='Escape'){const current=popupRef.current;setPopup(null);if(current?.keyboard)restore(current.snapshot);return}
      if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey) {
        const root=sourceAt(document.activeElement)||sourceAt(window.getSelection()?.anchorNode?.parentElement??null)
        if(!root)return;event.preventDefault();const rect=root.getBoundingClientRect();open(root,rect.left+30,rect.top+24,true)
      }
    }
    document.addEventListener('contextmenu',context,true);document.addEventListener('pointerdown',down,true);document.addEventListener('keydown',key,true)
    window.addEventListener('resize',close);window.addEventListener('blur',close)
    return()=>{document.removeEventListener('contextmenu',context,true);document.removeEventListener('pointerdown',down,true);document.removeEventListener('keydown',key,true);window.removeEventListener('resize',close);window.removeEventListener('blur',close)}
  },[])
  useEffect(()=>{
    close();window.getSelection()?.removeAllRanges()
    const content=document.querySelector<HTMLElement>('#body-preview [data-text-preview]')
    if(content){content.dataset.reviewText='';content.dataset.sourceName=scene==='body'?'正文预览':'Markdown 预览';content.tabIndex=0}
    if(shown.current)return
    shown.current=true
    const id=requestAnimationFrame(()=>{
      const root=document.querySelector<HTMLElement>('#body-preview [data-text-preview]'),p=root?.querySelector('p'),node=p?.firstChild
      if(!root||!node)return
      const range=document.createRange();range.setStart(node,0);range.setEnd(node,excerpt.length)
      const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)
      const rect=range.getBoundingClientRect();open(root,rect.right-20,rect.bottom+9)
    })
    return()=>cancelAnimationFrame(id)
  },[scene])
  useEffect(()=>{
    if(!popup||!menu.current)return
    const rect=menu.current.getBoundingClientRect()
    if(rect.bottom>window.innerHeight-8||rect.right>window.innerWidth-8)setPopup({...popup,x:Math.min(popup.x,window.innerWidth-rect.width-8),y:Math.min(popup.y,window.innerHeight-rect.height-8)})
    if(popup.keyboard)menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true})
  },[popup])
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(id)},[notice])

  function enabled(label:string,s:Snapshot) {
    if(label==='引用到对话')return !!s.text.trim()&&!s.sensitive
    if(label==='复制')return !!s.text
    if(label==='全选')return true
    if(['剪切','删除'].includes(label))return s.editable&&!!s.text
    if(['粘贴','粘贴为纯文本'].includes(label))return s.editable&&!!clipRef.current
    if(label==='撤销'||label==='重做')return s.editable&&document.queryCommandEnabled(label==='撤销'?'undo':'redo')
    return false
  }
  function restore(s:Snapshot) {
    s.root.focus({preventScroll:true})
    if(s.root instanceof HTMLInputElement||s.root instanceof HTMLTextAreaElement)s.root.setSelectionRange(s.start??0,s.end??0)
    else if(s.range){const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(s.range)}
  }
  function selectAll(root:HTMLElement) {
    root.focus({preventScroll:true})
    if(root instanceof HTMLInputElement||root instanceof HTMLTextAreaElement)root.setSelectionRange(0,root.value.length)
    else {const range=document.createRange();range.selectNodeContents(root);const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range)}
  }
  function run(label:string,s:Snapshot) {
    if(!enabled(label,s))return
    close()
    if(!s.root.isConnected||s.root.innerHTML!==s.html||(s.root instanceof HTMLInputElement||s.root instanceof HTMLTextAreaElement)&&s.root.value!==s.value){setNotice('文本已变化，请重新选择。');return}
    if(label==='引用到对话') {
      const root=composer.current;if(!root)return
      const value=root.innerText.replace(/\n$/,'')
      root.focus();const range=document.createRange();range.selectNodeContents(root);range.collapse(false)
      const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range)
      const text=(value?'\n\n':'')+s.text.replace(/\r\n/g,'\n').split('\n').map(line=>'> '+line).join('\n')+'\n\n'
      document.execCommand('insertText',false,text)
      setQuoted(v=>v+1);setNotice('已加入对话草稿，可继续输入。');return
    }
    restore(s)
    if(label==='复制'||label==='剪切'){setClip(s.text);setClipSecret(s.sensitive);if(label==='剪切')document.execCommand('delete');setNotice(label==='复制'?'已复制到审核稿的演示剪贴板。':'已剪切，可通过撤销恢复。');return}
    if(label==='全选'){selectAll(s.root);setSelectionInfo(s.sensitive?'敏感字段不展示选中文字':snapshot(s.root).text);return}
    if(label==='粘贴'||label==='粘贴为纯文本'){document.execCommand('insertText',false,clipRef.current);setNotice('已粘贴演示剪贴板的文本。');return}
    document.execCommand(label==='撤销'?'undo':label==='重做'?'redo':'delete')
  }
  const keyFor=(label:string)=>({撤销:modifier+'Z',重做:platform==='darwin'?'⇧⌘Z':'Ctrl+Y',剪切:modifier+'X',复制:modifier+'C',粘贴:modifier+'V',粘贴为纯文本:platform==='darwin'?'⇧⌘V':'Ctrl+Shift+V',全选:modifier+'A',删除:'Del'} as Record<string,string>)[label]??''
  const isPreview=scene==='body'||scene==='markdown'
  return <>
    <header className="review-header"><div className="wordmark"><span className="brand-square">玄</span><span>玄印写作<span className="muted"> / 交互审核</span></span></div><div className="header-controls"><div className="segmented" aria-label="主题"><button className={theme==='paper'?'active':''} onClick={()=>setTheme('paper')}><Sun size={14}/>宣纸</button><button className={theme==='ink'?'active':''} onClick={()=>setTheme('ink')}><Moon size={14}/>玄墨</button></div><select aria-label="快捷键展示平台" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="win32">Windows</option><option value="darwin">macOS</option></select><span className="approval-state">待审核</span></div></header>
    <main>
      <div className="intro"><div><p className="eyebrow">文本选取与操作</p><h1>文本右键菜单</h1><p>选中文字后单击右键。引用加入草稿，文本操作作用于原选区。</p></div><div className="intro-note"><MessageSquareQuote size={21}/><div>引用到对话<small>保留原文 · 由你继续编辑后发送</small></div></div></div>
      <nav className="scene-tabs" aria-label="文本场景">{scenes.map(([id,label])=><button key={id} aria-pressed={scene===id} className={scene===id?'active':''} onClick={()=>{setScene(id);shown.current=true;close()}}>{label}</button>)}</nav>
      <div className="review-grid">
        <section className="workspace" aria-label="右键交互演示">
          <div className="workspace-bar"><span><span className="live-dot"/>交互演示</span><span>示例文本 · 仅用于审核</span><PanelRight size={15}/></div>
          <div className="workspace-body">
            <section className={'conversation '+(isPreview?'':'wide-chat')} aria-label="创作对话">
              <div className="pane-heading"><MessageSquare size={16}/><span>创作对话</span><span className="pane-sub">草稿</span></div>
              <div className="conversation-scroll">
                <div className="user-message"><p data-review-text data-source-name="AI 用户消息" tabIndex={0}>帮我看看这段场景描写，有没有可以调整的地方。</p></div>
                <article className="assistant-message"><div className="assistant-label"><span className="small-brand">玄</span>AI 回复</div><div data-review-text data-source-name="AI 回复" tabIndex={0}><p>这段描写的节奏比较舒缓。可以保留雨后的环境细节，再用一个动作承接人物的心绪。</p><p>比如让人物<span>把信折好，却迟迟没有离开桥边</span>，读者便能感受到她的犹豫。</p><pre><code>环境 → 动作 → 情绪</code></pre></div></article>
                {(scene==='input'||scene==='empty')&&<div className="field-demo"><label htmlFor="ordinary-input">段落备注</label><textarea id="ordinary-input" data-review-text data-source-name="普通输入框" defaultValue={scene==='empty'?'':'让人物的情绪通过动作自然地表达。'} placeholder="这里也可以右键粘贴"/><p>编辑区中的选区支持剪切、粘贴和撤销。</p></div>}
                {scene==='readonly'&&<div className="field-demo"><label htmlFor="readonly-input">只读内容</label><textarea id="readonly-input" data-review-text data-source-name="只读输入框" defaultValue="只读内容仍可引用、复制与全选。" readOnly/><p>修改类操作置灰，原文保持不变。</p></div>}
                {scene==='secret'&&<div className="field-demo" data-review-secret><label htmlFor="secret-input">API Key</label><input id="secret-input" type="password" data-review-text data-source-name="API Key" defaultValue="review-only-placeholder" autoComplete="off"/><p>这是合成占位内容。引用到对话不可用。</p></div>}
                <p className="gesture-hint">拖选文字，再单击鼠标右键</p>
              </div>
              <div className="composer-area"><div className="composer-box"><div className="composer-title"><PencilLine size={13}/><span>对话草稿</span>{quoted>0&&<span className="quote-count">已加入 {quoted} 段引用</span>}</div><div ref={composer} className="review-composer" contentEditable suppressContentEditableWarning role="textbox" aria-label="对话草稿" aria-multiline="true" data-review-text data-source-name="AI 输入框">请帮我保留这一段的氛围。 <span contentEditable={false} className="review-chip" data-review-chip>场景 · 渡口</span></div><div className="composer-footer"><button className="reference-button" aria-label="添加引用示意" disabled><MessageSquareQuote size={14}/>添加引用</button><span>未配置模型</span><button className="send" disabled aria-label="发送不可用"><ArrowUp size={16}/></button></div></div><p className="composer-help">引用只准备草稿；发送仍由你决定。</p></div>
            </section>
            {isPreview&&<section className="preview-pane" aria-label={scene==='body'?'正文预览':'Markdown 预览'}><div className="pane-heading"><FileText size={16}/><span>{scene==='body'?'正文':'场景笔记'}</span><span className="preview-badge">预览</span><ChevronDown size={13}/></div><div id="body-preview" className="preview-scroll"><div className="chapter-meta">{scene==='body'?'段落示例':'Markdown 示例'}</div><h2 className="chapter-title">{scene==='body'?'雾中的渡口':'场景与节奏'}</h2><ReviewMarkdownPreview source={scene==='body'?manuscript:markdown} novel={scene==='body'}/><div className="preview-bottom">选中文字，右键即可引用或复制。</div></div></section>}
          </div>
        </section>
        <aside className="review-aside"><section><p className="eyebrow">当前选区</p><blockquote className="selection-summary">{selectionInfo}</blockquote><div className="state-row"><span>文本来源</span><strong>{popup?.snapshot.root.dataset.sourceName||scenes.find(([id])=>id===scene)?.[1]}</strong></div><div className="state-row"><span>操作范围</span><strong>{popup?.snapshot.editable?'可编辑文本':'所选文本'}</strong></div></section><section><p className="eyebrow">交互要点</p><ul className="review-notes"><li><Check size={15}/><span>引用排在首项，加入现有草稿。</span></li><li><Check size={15}/><span>只读文本保留复制与全选。</span></li><li><Check size={15}/><span>无选区时仍可打开基本菜单。</span></li><li><Check size={15}/><span>点击外部或按 Esc 关闭。</span></li></ul></section><section className="clipboard-panel"><p className="eyebrow"><Copy size={13}/>演示剪贴板</p><p className="clip-content">{clipSecret||popup?.snapshot.sensitive?'敏感内容不在审核栏显示':clip}</p><small>菜单复制与粘贴在此审核稿内演示，不访问系统剪贴板。</small></section><p className="native-note">安装版使用系统原生菜单；本稿展示菜单结构与状态。原生行高、圆角及外观随操作系统呈现。</p></aside>
      </div>
      <footer className="review-footer"><span>审核范围：右键入口、菜单项目、禁用状态与引用草稿。</span><span>调研 → 产品设计 → <strong>HTML 审核</strong> → 实现 → 测试</span></footer>
    </main>
    {popup&&<div ref={menu} className="text-menu" role="menu" aria-label="文本操作" style={{left:popup.x,top:popup.y}} onPointerDown={e=>e.preventDefault()} onKeyDown={e=>{const items=Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const index=items.indexOf(document.activeElement as HTMLButtonElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1)+items.length)%items.length]?.focus()}if(e.key==='Home'){e.preventDefault();items[0]?.focus()}if(e.key==='End'){e.preventDefault();items.at(-1)?.focus()}}}>{controls.filter(label=>popup.snapshot.historyMenu||!['撤销','重做'].includes(label)).map((label,index)=><React.Fragment key={label}>{['撤销','剪切','删除'].includes(label)&&<div className="menu-separator" role="separator"/>}<button role="menuitem" className={index===0?'quote-action':''} disabled={!enabled(label,popup.snapshot)} onClick={()=>run(label,popup.snapshot)}><span className="menu-icon">{index===0?<MessageSquareQuote size={15}/>:label==='复制'?<Copy size={14}/>:label==='剪切'?<Scissors size={14}/>:null}</span><span>{label}</span><kbd>{keyFor(label)}</kbd></button></React.Fragment>)}</div>}
    {notice&&<div className="notice" role="status"><Check size={16}/>{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}><X size={14}/></button></div>}
  </>
}
createRoot(document.getElementById('root')!).render(<App/> )
