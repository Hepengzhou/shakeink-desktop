/** Continuous poses avoid a jump when a card is reversed between rendered frames. */
export type CardMotionState = {
  position: number
  previousTime: number | null
  direction: -1 | 0 | 1
}

export type LogoMotionState = { startTime: number | null }

export function createCardMotion(): CardMotionState {
  return { position: 0, previousTime: null, direction: 0 }
}

export function createLogoMotion(): LogoMotionState {
  return { startTime: null }
}

export function advanceCardMotion(
  state: CardMotionState,
  now: number,
  triggered: boolean,
  allowed: boolean,
) {
  if (!allowed) return { state: createCardMotion(), frame: 0, active: false }
  const time = Math.max(now, state.previousTime ?? now)
  const position = state.previousTime === null
    ? state.position
    : Math.min(12, Math.max(0, state.position + (time - state.previousTime) / 50 * state.direction))
  const target = triggered ? 12 : 0
  const next: CardMotionState = {
    position,
    previousTime: time,
    direction: position === target ? 0 : triggered ? 1 : -1,
  }
  return { state: next, frame: Math.round(position), active: position !== target }
}

export function advanceLogoMotion(
  state: LogoMotionState,
  now: number,
  triggered: boolean,
  allowed: boolean,
) {
  if (!allowed || !triggered) return { state: createLogoMotion(), frame: 0, active: false }
  const startTime = state.startTime ?? now
  return {
    state: { startTime },
    frame: Math.floor(Math.max(0, now - startTime) / 62.5) % 64,
    active: true,
  }
}
