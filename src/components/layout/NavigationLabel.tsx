"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** Keep the complete string; only mask the trailing edge when it actually overflows. */
export function NavigationLabel({ children, className }: { children: string; className?: string }) {
  const element = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)
  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    let alive = true
    const measure = () => {
      if (alive && node.clientWidth > 0) setOverflow(node.scrollWidth > node.clientWidth + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    document.fonts?.addEventListener("loadingdone", measure)
    void document.fonts?.ready.then(measure)
    return () => { alive = false; observer.disconnect(); document.fonts?.removeEventListener("loadingdone", measure) }
  }, [children])
  return <span ref={element} title={children} className={cn("nav-label min-w-0 overflow-hidden whitespace-nowrap", className)} data-overflow={overflow || undefined}>{children}</span>
}
