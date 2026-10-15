// Design-only local fixture. Never imported by the product.
import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { Toaster as CurrentToaster } from "../../src/components/ui/sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon, ArrowRightIcon, SunIcon, MoonIcon } from "lucide-react"

type Kind = "info" | "success" | "warning" | "error" | "loading" | "normal"
type Scene = "action" | "short" | "long" | "stack" | "progress"
const types: { kind: Kind; label: string; title: string }[] = [
  { kind: "info", label: "提示", title: "候选稿已保留，原稿未替换" },
  { kind: "success", label: "成功", title: "正文已保存" },
  { kind: "warning", label: "警告", title: "部分修改尚未保存" },
  { kind: "error", label: "错误", title: "导出失败，原草稿仍保留在本机" },
  { kind: "loading", label: "加载", title: "正在生成导出文件…" },
  { kind: "normal", label: "一般", title: "此命令在当前视图不可用" },
]
const icons = {
  info: <InfoIcon size={20} />,
  success: <CircleCheckIcon size={20} />,
  warning: <TriangleAlertIcon size={20} />,
  error: <OctagonXIcon size={20} />,
  loading: <Loader2Icon size={20} className="proposal-spin" />,
}
const longTitles: Record<Kind, string> = {
  info: "待核对草稿已保留，原稿未替换。你可以打开草稿查看内容，再决定是否恢复修改。",
  success: "正文已保存。本次修改已写入本机，关闭后重新打开仍可继续编辑。",
  warning: "部分修改尚未保存。请保留当前窗口，检查保存状态后再继续。",
  error: "导出失败，原草稿仍保留在本机。请检查目标目录的写入权限后重试。",
  loading: "正在生成导出文件。内容较多时可能需要稍等，完成后将更新此条消息。",
  normal: "此命令在当前视图不可用。你可以切换到对应内容面板后再次操作。",
}

function ProposedToaster({ id, theme }: { id: string; theme: string }) {
  return <Sonner id={id} position="top-center" theme={theme === "ink" ? "dark" : "light"}
    className="proposal-toaster" richColors icons={icons}
    style={{ "--width": "420px" } as React.CSSProperties}
    toastOptions={{ duration: Infinity, classNames: { toast: "proposal-toast" } }} />
}

function emit(kind: Kind, title: string, options: Parameters<typeof toast.info>[1]) {
  if (kind === "normal") return toast(title, options)
  return toast[kind](title, options)
}

function Viewer() {
  const [theme, setTheme] = useState("paper")
  const [kind, setKind] = useState<Kind>("info")
  const [scene, setScene] = useState<Scene>("action")
  const [feedback, setFeedback] = useState("示例按钮只在此页演示点击反馈。")
  const [replay, setReplay] = useState(0)
  const [completed, setCompleted] = useState(false)
  const sequence = useRef(0)
  const previousIds = useRef<string[]>([])
  const mainIds = useRef<{ variant: string; id: string }[]>([])

  useEffect(() => {
    for (const item of types) emit(item.kind, item.title, { toasterId: `atlas-${item.kind}`, id: `atlas-${item.kind}`, duration: Infinity })
  }, [theme])

  useEffect(() => {
    for (const id of previousIds.current) toast.dismiss(id)
    previousIds.current = []
    mainIds.current = []
    const generation = ++sequence.current
    setCompleted(false)
    const item = types.find(item => item.kind === kind)!
    const activeKind = scene === "progress" ? "loading" : kind
    const title = scene === "progress" ? "正在生成导出文件…" :
      scene === "action" && kind === "info" ? "已保留 1 项待核对草稿" :
      scene === "long" ? longTitles[kind] : item.title
    const options = {
      duration: Infinity,
      action: undefined,
      description: undefined,
      ...(scene === "long" ? { description: "设计示例：状态说明完整显示，操作按钮保留原流程。" } : {}),
      ...(["action", "long"].includes(scene) && activeKind !== "loading" ? {
        action: { label: kind === "info" && scene === "action" ? "查看草稿" : "查看详情", onClick: () => setFeedback("已点击示例操作。产品中将继续执行消息原有的业务操作。") },
      } : {}),
    }
    for (const variant of ["current", "proposed"]) {
      if (scene === "stack") {
        const third = `${variant}-${generation}-third`, secondary = `${variant}-${generation}-secondary`
        previousIds.current.push(third, secondary)
        toast.success("正文已保存", { id: third, toasterId: variant, duration: Infinity })
        toast.info("候选稿已保留，原稿未替换", { id: secondary, toasterId: variant, duration: Infinity })
      }
      const id = `${variant}-${generation}-main`
      previousIds.current.push(id)
      mainIds.current.push({ variant, id })
      emit(activeKind, title, { ...options, id, toasterId: variant })
    }
  }, [kind, scene, replay, theme])

  function finishProgress() {
    for (const { variant, id } of mainIds.current) toast.success("导出文件已保存", { id, toasterId: variant, duration: Infinity, action: undefined, description: undefined })
    setCompleted(true)
  }

  return <ThemeProvider key={theme} attribute="class" defaultTheme={theme} forcedTheme={theme} themes={["paper", "ink"]} enableSystem={false} storageKey="shakeink-toast-design-only">
    <main>
      <header className="review-heading">
        <div><div className="eyebrow">玄印写作 · 界面设计审核</div><h1>顶部消息，清晰一点。</h1><p>实色表面承托消息，彩色图标表达状态。</p></div>
        <div className="theme-switch" role="group" aria-label="预览主题">
          <button aria-pressed={theme === "paper"} onClick={() => setTheme("paper")}><SunIcon size={16} />宣纸</button>
          <button aria-pressed={theme === "ink"} onClick={() => setTheme("ink")}><MoonIcon size={16} />玄墨</button>
        </div>
      </header>
      <div className="review-note"><span className="review-dot" />第一版 · 待审核<span className="note-divider" />以下均为本地设计示例，尚未修改产品。</div>
      <section className="comparison" aria-label="当前与拟议消息框对照">
        <div className="comparison-toolbar">
          <div><h2>同一条消息，前后对照</h2><p>背后的横线用于直观检查背景是否透出。</p></div>
          <div className="selectors">
            <label>消息类型<select aria-label="消息类型" value={kind} onChange={event => setKind(event.target.value as Kind)} disabled={scene === "progress"}>{types.map(item => <option key={item.kind} value={item.kind}>{item.label}</option>)}</select></label>
            <label>内容场景<select aria-label="内容场景" value={scene} onChange={event => setScene(event.target.value as Scene)}><option value="action">带操作按钮</option><option value="short">简短消息</option><option value="long">长消息与说明</option><option value="stack">多消息堆叠</option><option value="progress">加载转成功</option></select></label>
          </div>
        </div>
        <div className="compare-grid">
          <article className="compare-column"><div className="column-label"><span>当前组件</span><span className="label-detail">现有源码渲染</span></div>
            <div className="demo-frame current-frame"><div className="demo-caption">顶部区域 · 位置示意</div><div className="background-rule" /><div className="quiet-lines" aria-hidden="true" />
              <CurrentToaster id="current" richColors position="top-center" toastOptions={{ duration: Infinity, classNames: { toast: "cn-toast" } }} />
            </div>
          </article>
          <article className="compare-column"><div className="column-label"><span>拟议样式</span><span className="label-detail proposed-label">实色卡片 · 类型色图标</span></div>
            <div className="demo-frame proposed-frame"><div className="demo-caption">顶部区域 · 位置示意</div><div className="background-rule" /><div className="quiet-lines" aria-hidden="true" />
              <ProposedToaster id="proposed" theme={theme} />
            </div>
          </article>
        </div>
        <div className="demo-footer"><span aria-live="polite">{feedback}</span><div>{scene === "progress" && <button className="text-button" disabled={completed} onClick={finishProgress}>{completed ? "已完成示例" : "模拟完成"}<ArrowRightIcon size={14} /></button>}<button className="text-button" onClick={() => { setReplay(value => value + 1); setFeedback("已重新显示示例消息。") }}>重新显示</button></div></div>
      </section>
      <section className="type-section" aria-labelledby="type-heading">
        <div className="section-heading"><div><h2 id="type-heading">六种状态，一套清楚的样式</h2><p>正文保持中性色，颜色集中在图标。不同形状让状态更容易辨认。</p></div><span className="small-label">拟议样式 · 同比例展示</span></div>
        <div className="type-grid">{types.map(item => <article className="type-example" key={item.kind}><div className="type-label"><span>{item.label}</span><span>{({ info: "蓝色 · 圆形提示", success: "绿色 · 圆形勾", warning: "琥珀色 · 三角警告", error: "红色 · 八角叉", loading: "灰蓝色 · 旋转圆弧", normal: "中性 · 沿用调用方" })[item.kind]}</span></div><div className="specimen"><ProposedToaster id={`atlas-${item.kind}`} theme={theme} /></div></article>)}</div>
      </section>
      <footer className="review-footer"><p>本稿只调整消息框表面、图标、排版和按钮外观。业务文案、操作、计时与队列沿用现有流程。</p><p>审核重点：背景不透底、类型色清楚、两种主题协调、长消息与按钮完整显示。</p><div className="doc-links"><a href="../../docs/reviews/2026-10-12-toast-style-research.md">调研文档 ↗</a><a href="../../docs/reviews/2026-10-12-toast-style-product-design.md">产品设计文档 ↗</a></div></footer>
    </main>
  </ThemeProvider>
}

createRoot(document.getElementById("root")!).render(<Viewer />)
