"use client"
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UnavailableWork } from '@desktop/shared/work-list'
import { NavigationLabel } from '@/components/layout/NavigationLabel'

/** A failed directory is an indexed work, never an empty or operable novel. */
export function UnavailableWorks({ works, retrying, retry, scope = '', renderWork }: { works: UnavailableWork[]; retrying: boolean; retry(): void; scope?: string; renderWork?: (work: UnavailableWork, details: ReactNode) => ReactNode }) {
  const alive = useRef(false), flight = useRef(false)
  const currentScope = useRef(scope); currentScope.current = scope
  const [busy, setBusy] = useState<'repairing' | 'pending' | 'restarting' | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { setBusy(null); setError(null) }, [scope])
  const repair = async (work: UnavailableWork) => {
    const bridge = window.desktop
    if (flight.current || busy || work.reason !== 'stale-lease' || !bridge?.repairWorkLease) return
    flight.current = true; setBusy('repairing'); setError(null)
    const requestScope = scope
    try {
      const result = await bridge.repairWorkLease({ type: 'start', workId: work.workId })
      if (alive.current && currentScope.current === requestScope) setBusy(result === 'cancelled' ? null : result)
    } catch {
      if (alive.current && currentScope.current === requestScope) { setBusy(null); setError('暂时无法开始锁修复，原文件已保留，请重试。') }
    } finally { flight.current = false }
  }
  if (!works.length) return null
  const canRepair = typeof window !== 'undefined' && !!window.desktop?.repairWorkLease
  return <div className={renderWork ? 'space-y-2 py-1' : 'space-y-2 px-2 py-3'} aria-label="暂不可用的作品">
    {works.map(work => {
      const details = <div className="px-3 py-2"><p className="flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="size-4 shrink-0 text-destructive"/>{work.reason === 'stale-lease' ? '上次异常退出留下了写入锁，作品内容已保留。' : '作品目录暂不可用，请检查目录后重新加载。'}</p>
        {work.reason === 'stale-lease' && canRepair && <Button variant="outline" size="sm" className="mt-2" disabled={!!busy || retrying} onClick={() => void repair(work)}>{busy === 'repairing' ? '正在准备修复…' : busy === 'restarting' ? '正在重新启动…' : busy === 'pending' ? '修复交接待完成' : '修复作品锁'}</Button>}
      </div>
      return <div key={work.workId}>{renderWork ? renderWork(work, details) : <div className="rounded-md border border-border py-2"><div className="flex items-center gap-2 px-3 text-sm font-medium"><AlertCircle className="size-4 shrink-0 text-destructive"/><NavigationLabel className="flex-1">{work.title}</NavigationLabel></div>{details}</div>}</div>
    })}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Button variant="outline" size="sm" disabled={retrying || !!busy} onClick={retry}><RefreshCw className="size-3.5"/>{retrying ? '正在重新加载…' : '重新加载作品'}</Button>
  </div>
}
