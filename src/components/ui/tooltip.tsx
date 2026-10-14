"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { useLayoutEffect, useRef } from "react"

import { cn } from "@/lib/utils"
import { useContentDrawerInteraction, useContentDrawerPopup } from "@/lib/desktop/content-drawer-context"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  const drawer = useContentDrawerInteraction()
  return drawer ? <DrawerTooltip {...props} /> : <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}
function DrawerTooltip(props: TooltipPrimitive.Root.Props) {
  const popup = useContentDrawerPopup(props)
  type Details = TooltipPrimitive.Root.ChangeEventDetails
  const gate = useRef({
    awaitingInput: popup.wasPaused,
    point: null as { x: number; y: number } | null,
    fresh: null as { trigger: Element; reason: Details["reason"] } | null,
    pending: null as { trigger: Element; details: Details } | null,
    key: null as KeyboardEvent | null,
  })
  function usable(trigger: Element | undefined): trigger is Element {
    if (!trigger?.isConnected || trigger.closest('[inert],[hidden],[aria-hidden="true"]') || trigger.hasAttribute("data-disabled")) return false
    const rect = trigger.getBoundingClientRect(), style = getComputedStyle(trigger)
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"
  }
  function submit(details: Details) {
    gate.current.pending = null
    popup.onOpenChange(true, details)
    // Preserve the real Base UI getter and give the caller exactly one chance
    // to cancel. Rejected intent never clears the pause/input barrier.
    if (!details.isCanceled && !popup.paused) gate.current.awaitingInput = false
    gate.current.fresh = null
  }
  const latest = useRef({ paused: popup.paused, disabled: props.disabled, submit })
  latest.current = { paused: popup.paused, disabled: props.disabled, submit }
  useLayoutEffect(() => {
    if (popup.paused) {
      gate.current.awaitingInput = true
      gate.current.pending = null; gate.current.fresh = null; gate.current.key = null
    }
  }, [popup.paused])
  useLayoutEffect(() => {
    let keyTimer: ReturnType<typeof setTimeout> | undefined
    const triggerAt = (target: EventTarget | null) => target instanceof Element ? target.closest("[data-base-ui-tooltip-trigger]") ?? undefined : undefined
    const interactive = () => !latest.current.paused && !latest.current.disabled
    const move = (event: PointerEvent) => {
      const state = gate.current, previous = state.point
      state.point = { x: event.clientX, y: event.clientY }
      if (previous && previous.x === event.clientX && previous.y === event.clientY) return
      const trigger = triggerAt(event.target)
      state.fresh = interactive() && usable(trigger) ? { trigger, reason: "trigger-hover" } : null
      const pending = state.pending
      if (!pending || !state.fresh || pending.trigger !== trigger || pending.details.isCanceled) return
      // Base UI hover uses move:false. A layout-induced enter is held until a
      // real move over the same usable trigger; forward that original uncanceled
      // hover intent (including its native event/getter), never synthetic details.
      latest.current.submit(pending.details)
    }
    const press = (event: PointerEvent) => {
      const trigger = triggerAt(event.target), state = gate.current
      state.pending = null
      state.fresh = interactive() && usable(trigger) ? { trigger, reason: "trigger-press" } : null
      // Do not replay hover on press: Base UI closeOnClick cancels it.
    }
    const key = (event: KeyboardEvent) => {
      gate.current.pending = null; gate.current.fresh = null
      gate.current.key = interactive() ? event : null
      clearTimeout(keyTimer)
      keyTimer = setTimeout(() => { gate.current.key = null }, 0)
    }
    const focus = (event: FocusEvent) => {
      const trigger = triggerAt(event.target)
      // Keyboard default action focuses its new trigger within this task.
      // A key elsewhere alone cannot unlock/replay a pending tooltip.
      if (gate.current.key && interactive() && usable(trigger) && trigger.contains(document.activeElement)) gate.current.fresh = { trigger, reason: "trigger-focus" }
    }
    const leave = (event: PointerEvent) => {
      const state = gate.current, next = event.relatedTarget
      if (state.pending && !(next instanceof Node && state.pending.trigger.contains(next))) state.pending = null
      if (state.fresh && !(next instanceof Node && state.fresh.trigger.contains(next))) state.fresh = null
    }
    const click = () => { gate.current.pending = null }
    document.addEventListener("pointermove", move, true)
    document.addEventListener("pointerdown", press, true)
    document.addEventListener("pointerout", leave, true)
    document.addEventListener("keydown", key, true)
    document.addEventListener("focusin", focus, true)
    document.addEventListener("click", click, true)
    return () => {
      clearTimeout(keyTimer)
      gate.current.pending = null; gate.current.fresh = null; gate.current.key = null
      document.removeEventListener("pointermove", move, true)
      document.removeEventListener("pointerdown", press, true)
      document.removeEventListener("pointerout", leave, true)
      document.removeEventListener("keydown", key, true)
      document.removeEventListener("focusin", focus, true)
      document.removeEventListener("click", click, true)
    }
  }, [])
  const onOpenChange = (open: boolean, details: Details) => {
    if (!open) {
      gate.current.pending = null; gate.current.fresh = null
      popup.onOpenChange(false, details)
      return
    }
    if (popup.paused || props.disabled) return
    const state = gate.current, trigger = details.trigger
    if (state.awaitingInput && (!usable(trigger) || state.fresh?.trigger !== trigger || state.fresh.reason !== details.reason)) {
      if (details.reason === "trigger-hover" && usable(trigger) && !details.isCanceled) state.pending = { trigger, details }
      return
    }
    submit(details)
  }
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} open={popup.open} onOpenChange={onOpenChange} disabled={props.disabled || popup.paused} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const drawer = useContentDrawerInteraction(), paused = drawer?.paused ?? false
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
        data-content-drawer-owned={drawer ? "true" : undefined}
        data-content-drawer-paused={paused || undefined}
        inert={paused}
        aria-hidden={paused || undefined}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
