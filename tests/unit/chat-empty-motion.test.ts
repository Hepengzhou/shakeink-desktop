import assert from "node:assert/strict"
import { test } from "node:test"
import {
  advanceCardMotion, advanceLogoMotion, createCardMotion, createLogoMotion,
} from "../../src/components/chat/chat-empty-motion"

test("card artwork opens to frame 12, holds without scheduling, and returns to frame zero", () => {
  let step = advanceCardMotion(createCardMotion(), 100, true, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, true)
  step = advanceCardMotion(step.state, 400, true, true)
  assert.equal(step.frame, 6)
  step = advanceCardMotion(step.state, 800, true, true)
  assert.equal(step.frame, 12)
  assert.equal(step.active, false)
  step = advanceCardMotion(step.state, 1200, false, true)
  assert.equal(step.frame, 12)
  assert.equal(step.active, true)
  step = advanceCardMotion(step.state, 1500, false, true)
  assert.equal(step.frame, 6)
  step = advanceCardMotion(step.state, 1800, false, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, false)
})

test("mid-flight reversals preserve fractional poses and integrate the preceding direction", () => {
  let step = advanceCardMotion(createCardMotion(), 0, true, true)
  step = advanceCardMotion(step.state, 125, false, true)
  assert.equal(step.state.position, 2.5)
  assert.equal(step.state.direction, -1)
  step = advanceCardMotion(step.state, 150, true, true)
  assert.equal(step.state.position, 2)
  assert.equal(step.state.direction, 1)
  step = advanceCardMotion(step.state, 175, true, true)
  assert.equal(step.state.position, 2.5)
  assert.equal(step.frame, 3)
})

test("animation timestamps earlier than the last event cannot move a pose backwards", () => {
  let step = advanceCardMotion(createCardMotion(), 100, true, true)
  step = advanceCardMotion(step.state, 250, true, true)
  const snapshot = step.state
  step = advanceCardMotion(snapshot, 240, false, true)
  assert.equal(step.state.position, 3)
  assert.equal(step.state.previousTime, 250)
  assert.equal(snapshot.direction, 1, "the reducer must not mutate its input")
  step = advanceCardMotion(step.state, 275, false, true)
  assert.equal(step.state.position, 2.5)
})

test("long background gaps clamp a card to its target rather than looping", () => {
  let step = advanceCardMotion(createCardMotion(), 0, true, true)
  step = advanceCardMotion(step.state, 1_000_000, true, true)
  assert.equal(step.frame, 12)
  assert.equal(step.active, false)
  step = advanceCardMotion(step.state, 1_000_000, false, true)
  step = advanceCardMotion(step.state, 2_000_000, false, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, false)
})

test("pausing clears the card pose and time, then a still-held trigger starts a fresh expansion", () => {
  let step = advanceCardMotion(createCardMotion(), 0, true, true)
  step = advanceCardMotion(step.state, 200, true, true)
  step = advanceCardMotion(step.state, 300, true, false)
  assert.deepEqual(step.state, createCardMotion())
  assert.equal(step.frame, 0)
  assert.equal(step.active, false)
  step = advanceCardMotion(step.state, 1000, true, true)
  assert.equal(step.frame, 0)
  step = advanceCardMotion(step.state, 1050, true, true)
  assert.equal(step.frame, 1)
})

test("an untouched card remains idle at frame zero", () => {
  const step = advanceCardMotion(createCardMotion(), 100, false, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, false)
})

test("the logo loops its 64 frames at 16 fps only while an allowed trigger is held", () => {
  let step = advanceLogoMotion(createLogoMotion(), 100, true, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, true)
  step = advanceLogoMotion(step.state, 162.5, true, true)
  assert.equal(step.frame, 1)
  step = advanceLogoMotion(step.state, 4037.5, true, true)
  assert.equal(step.frame, 63)
  step = advanceLogoMotion(step.state, 4100, true, true)
  assert.equal(step.frame, 0)
  assert.equal(step.active, true)
  step = advanceLogoMotion(step.state, 4200, false, true)
  assert.deepEqual(step.state, createLogoMotion())
  assert.equal(step.active, false)
})

test("the logo resets when blocked and clamps an early first rAF timestamp", () => {
  let step = advanceLogoMotion(createLogoMotion(), 200, true, true)
  step = advanceLogoMotion(step.state, 190, true, true)
  assert.equal(step.frame, 0)
  step = advanceLogoMotion(step.state, 400, true, false)
  assert.deepEqual(step.state, createLogoMotion())
  assert.equal(step.frame, 0)
  assert.equal(step.active, false)
  step = advanceLogoMotion(step.state, 600, true, true)
  assert.equal(step.frame, 0)
})
