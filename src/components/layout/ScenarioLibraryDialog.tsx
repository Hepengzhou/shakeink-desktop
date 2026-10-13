"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FlaskConical, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { buildTabId, useTabsStore } from "@/stores/tabs"
import type { NovelSummary } from "../content/types"
import { ScenarioCreateDialog, type ScenarioCreatePayload } from "./ScenarioCreateDialog"
import { NavigationMenu, NavigationMenuContent } from "./sidebar-navigation-state"

export interface ScenarioSummary { id: string; novelId: string; title: string; status: string; turnCount: number; nodeCount: number }
export interface ScenarioLibrarySession { id: number; novel: NovelSummary; initialMode: "library" | "create"; launcher: HTMLElement | null }
type Mode = "library" | "create" | "rename" | "delete"
async function readError(response: Response, fallback: string) {
  try { return ((await response.json()) as { error?: string }).error ?? fallback } catch { return fallback }
}
function usable(element: HTMLElement | null | undefined) { return !!element?.isConnected && !element.closest("[inert], [hidden]") && element.getClientRects().length > 0 }

/** Original scenario query/mutations and cast form, presented through one modal lifecycle. */
export function ScenarioLibraryDialog({ session, scope, onClose, fallbackFocus }: { session: ScenarioLibrarySession | null; scope: string; onClose(): void; fallbackFocus(): HTMLElement | null }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>("library")
  const [record, setRecord] = useState<ScenarioSummary | null>(null)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const aliveScope = useRef(scope); aliveScope.current = scope
  const currentSession = useRef(session); currentSession.current = session
  const libraryOrigin = useRef(false)
  const focusTarget = useRef<string>("new")
  const newButton = useRef<HTMLButtonElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const records = useRef(new Map<string, HTMLButtonElement>())
  const previousSession = useRef<number | null>(null)
  const novelId = session?.novel.id ?? ""
  const shownMode = session && previousSession.current !== session.id ? session.initialMode : mode
  const query = useQuery({
    queryKey: ["scenarios", novelId], enabled: !!session && shownMode === "library",
    queryFn: async () => {
      const response = await fetch(`/api/novels/${novelId}/scenarios`)
      if (!response.ok) throw new Error(await readError(response, "加载情景试验场失败"))
      return (await response.json()) as { scenarios: ScenarioSummary[] }
    },
  })
  const libraryFocus = () => records.current.get(focusTarget.current) ?? newButton.current
  useLayoutEffect(() => {
    controller.current?.abort(); controller.current = null
    setBusy(false); setError(null); setNotice(null); setRecord(null); setTitle("")
    previousSession.current = session?.id ?? null
    libraryOrigin.current = session?.initialMode === "library"
    focusTarget.current = "new"
    setMode(session?.initialMode ?? "library")
    return () => { controller.current?.abort(); controller.current = null }
  }, [session?.id, scope])
  useLayoutEffect(() => {
    if (!session) return
    // Focus the replacement before Base UI's focusout microtask sees body focus.
    // Delaying this to rAF makes its restoreFocus="popup" frame overwrite the record.
    const target = shownMode === "library" ? libraryFocus() : shownMode === "delete" ? document.getElementById("scenario-delete-cancel") : titleInput.current
    if (usable(target)) target?.focus()
  }, [shownMode, session?.id])
  const invalidate = (id: string) => { void queryClient.invalidateQueries({ queryKey: ["scenarios", id] }) }
  const cancelRequest = () => { controller.current?.abort(); controller.current = null; setBusy(false) }
  const close = () => { cancelRequest(); onClose() }
  const back = () => {
    cancelRequest(); setError(null)
    if (shownMode === "create" && !libraryOrigin.current) { close(); return }
    focusTarget.current = shownMode === "create" ? "new" : record?.id ?? "new"
    setMode("library")
  }
  const start = () => {
    if (controller.current || !session) return null
    const job = new AbortController(); controller.current = job
    setBusy(true); setError(null)
    return { job, owner: session, requestScope: scope }
  }
  const valid = (job: AbortController, owner: ScenarioLibrarySession, requestScope: string) => !job.signal.aborted && controller.current === job && currentSession.current?.id === owner.id && aliveScope.current === requestScope
  const finish = (job: AbortController) => { if (controller.current === job) { controller.current = null; setBusy(false) } }
  const navigate = async (scenario: ScenarioSummary, job: AbortController, owner: ScenarioLibrarySession, requestScope: string) => {
    if (!valid(job, owner, requestScope)) return
    const success = await useTabsStore.getState().openTabForNavigation({ id: buildTabId("scenario", owner.novel.id, { refId: scenario.id }), type: "scenario", novelId: owner.novel.id, refId: scenario.id, title: scenario.title }, job.signal)
    if (!valid(job, owner, requestScope)) return
    if (success) close()
    else setError("页面尚未切换，请重试打开此试验场。")
  }
  const open = async (scenario: ScenarioSummary) => {
    const request = start(); if (!request) return
    try { await navigate(scenario, request.job, request.owner, request.requestScope) }
    catch (cause) { if (valid(request.job, request.owner, request.requestScope)) setError(cause instanceof Error ? cause.message : "页面尚未切换，请重试。") }
    finally { finish(request.job) }
  }
  const create = async (payload: ScenarioCreatePayload) => {
    const request = start(); if (!request) return
    const { job, owner, requestScope } = request
    try {
      const response = await fetch(`/api/novels/${owner.novel.id}/scenarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: payload.title, ...(payload.cast.length ? { cast: payload.cast } : {}) }) })
      if (!response.ok) throw new Error(await readError(response, "创建失败"))
      const { scenario } = (await response.json()) as { scenario: ScenarioSummary }
      if (aliveScope.current === requestScope) {
        queryClient.setQueryData<{ scenarios: ScenarioSummary[] }>(["scenarios", owner.novel.id], data => ({ scenarios: [...(data?.scenarios ?? []).filter(item => item.id !== scenario.id), scenario] }))
        invalidate(owner.novel.id)
      }
      if (!valid(job, owner, requestScope)) return
      toast.success(`情景试验场「${scenario.title}」已创建`)
      // The record already exists: no creation form remains available to submit again.
      setNotice("已创建，页面尚未切换"); focusTarget.current = scenario.id; setMode("library")
      await navigate(scenario, job, owner, requestScope)
    } catch (cause) { if (valid(job, owner, requestScope)) setError(cause instanceof Error ? cause.message : "创建失败") }
    finally { finish(job) }
  }
  const edit = async () => {
    if (!record || (shownMode === "rename" && !title.trim())) return
    const request = start(); if (!request) return
    const { job, owner, requestScope } = request, deleting = shownMode === "delete", selected = record
    try {
      const response = await fetch(`/api/novels/${owner.novel.id}/scenarios/${selected.id}`, { method: deleting ? "DELETE" : "PATCH", ...(deleting ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() }) }) })
      if (!response.ok) throw new Error(await readError(response, deleting ? "删除失败" : "重命名失败"))
      const renamed = deleting ? null : ((await response.json()) as { scenario: ScenarioSummary }).scenario
      if (aliveScope.current === requestScope) {
        if (deleting) useTabsStore.getState().closeTab(buildTabId("scenario", owner.novel.id, { refId: selected.id }))
        else if (renamed) useTabsStore.getState().renameScenarioTab(renamed.id, renamed.title)
        queryClient.setQueryData<{ scenarios: ScenarioSummary[] }>(["scenarios", owner.novel.id], data => ({ scenarios: (data?.scenarios ?? []).flatMap(item => item.id === selected.id ? renamed ? [renamed] : [] : [item]) }))
        invalidate(owner.novel.id)
      }
      if (!valid(job, owner, requestScope)) return
      toast.success(deleting ? `情景试验场「${selected.title}」已删除` : "已重命名")
      focusTarget.current = deleting ? "new" : selected.id; setMode("library")
    } catch (cause) { if (valid(job, owner, requestScope)) setError(cause instanceof Error ? cause.message : "操作失败") }
    finally { finish(job) }
  }
  if (!session) return null
  return <Dialog open onOpenChange={next => { if (!next) shownMode === "library" ? close() : back() }}>
    <DialogContent className="scenario-library max-h-[calc(100dvh-32px)] overflow-y-auto sm:max-w-[448px]" initialFocus={() => shownMode === "library" ? libraryFocus() : titleInput.current} finalFocus={() => usable(session.launcher) ? session.launcher : fallbackFocus()}>
      {shownMode === "create" ? <ScenarioCreateDialog key={`create-${session.id}`} novel={session.novel} open pending={busy} contentOnly inputRef={titleInput} onOpenChange={next => { if (!next) back() }} onSubmit={payload => void create(payload)} /> : <>
        <DialogHeader><DialogTitle>{shownMode === "rename" ? "重命名情景试验场" : shownMode === "delete" ? "删除情景试验场" : "情景试验场"}</DialogTitle><DialogDescription>{shownMode === "delete" ? `确定要删除试验场「${record?.title ?? ""}」吗？推演记录、情节点、分镜卡与样文将一并删除，该操作不可撤销。` : shownMode === "rename" ? "为这个试验场起一个新名字。" : session.novel.title}</DialogDescription></DialogHeader>
        {shownMode === "library" ? <>
          <Button ref={newButton} className="justify-self-start" disabled={busy} onClick={() => { libraryOrigin.current = true; setNotice(null); setError(null); setMode("create") }}><Plus />新建情景试验场</Button>
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
          <div className="scenario-library-list min-h-0 max-h-[max(96px,calc(100dvh-260px))] overflow-y-auto">
            {query.isPending ? <p className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载中…</p> : query.isError ? <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>重试</Button></div> : !query.data?.scenarios.length ? <p className="py-4 text-muted-foreground">暂无试验场</p> : query.data.scenarios.map(scenario => <div key={scenario.id} className="scenario-library-row flex min-h-[52px] items-center gap-2 rounded-md border-b border-border py-2">
              <FlaskConical className="size-4 shrink-0 text-muted-foreground" />
              <button type="button" ref={node => { if (node) records.current.set(scenario.id, node); else records.current.delete(scenario.id) }} title={scenario.title} disabled={busy} className="min-w-0 flex-1 break-words text-left" onClick={() => void open(scenario)}>{scenario.title}</button>
              <NavigationMenu><DropdownMenuTrigger render={<button type="button" aria-label={`试验场操作：${scenario.title}`} disabled={busy} className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-hover-wash" />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><NavigationMenuContent align="end"><DropdownMenuItem onClick={() => { setRecord(scenario); setTitle(scenario.title); setError(null); setMode("rename") }}><Pencil />重命名</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => { setRecord(scenario); setError(null); setMode("delete") }}><Trash2 />删除</DropdownMenuItem></NavigationMenuContent></NavigationMenu>
            </div>)}
          </div>
          {busy && <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在打开…</p>}
          <DialogFooter><Button variant="outline" onClick={close}>关闭</Button></DialogFooter>
        </> : <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); void edit() }}>
          {shownMode === "rename" && <Input ref={titleInput} autoFocus aria-label="试验场名称" value={title} maxLength={100} disabled={busy} onChange={event => setTitle(event.target.value)} />}
          <DialogFooter><Button id="scenario-delete-cancel" type="button" variant="outline" onClick={back}>取消</Button><Button type="submit" variant={shownMode === "delete" ? "destructive" : "default"} disabled={busy || (shownMode === "rename" && !title.trim())}>{busy && <Loader2 className="animate-spin" />}{shownMode === "delete" ? "确认删除" : "保存"}</Button></DialogFooter>
        </form>}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>
}
