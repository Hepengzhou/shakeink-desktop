import assert from 'node:assert/strict'
import { test } from 'node:test'
import { offerConfigReset, type ConfigResetOfferHost } from '../../desktop/main/config-reset-offer'

function host() {
  const calls: string[] = []
  const recorder: ConfigResetOfferHost = {
    launchDegradedWorkbench: async () => { calls.push('launch'); return { id: 'window-stub' } },
    confirm: async () => { calls.push('confirm'); return true },
    wipe: async () => { calls.push('wipe') },
    relaunch: () => { calls.push('relaunch') },
    quit: () => { calls.push('quit') },
    fatal: () => { calls.push('fatal') },
  }
  return { calls, recorder }
}

test('CR-01 choosing wipe-and-restart wipes the original root then relaunches without quitting', async () => {
  const { calls, recorder } = host()
  const seen: { reason?: string; rootPath?: string; window?: unknown } = {}
  recorder.confirm = async input => { calls.push('confirm'); seen.reason = input.reason; seen.rootPath = input.rootPath; seen.window = input.window; return true }
  await offerConfigReset({ reason: 'content-damaged', rootPath: '/broken-root', host: recorder })
  assert.deepEqual(calls, ['launch', 'confirm', 'wipe', 'relaunch'])
  assert.deepEqual(seen, { reason: 'content-damaged', rootPath: '/broken-root', window: { id: 'window-stub' } })
})

test('CR-02 declining or dismissing the dialog quits without any wipe or relaunch', async () => {
  for (const confirm of [async () => false, async () => { throw Error('dialog dismissed') }]) {
    const { calls, recorder } = host()
    recorder.confirm = async () => { calls.push('confirm'); return confirm() }
    await offerConfigReset({ reason: 'root-mismatch', rootPath: '/broken-root', host: recorder })
    assert.deepEqual(calls, ['launch', 'confirm', 'quit'])
  }
})

test('CR-03 a degraded launch failure goes fatal without ever asking', async () => {
  const { calls, recorder } = host()
  recorder.launchDegradedWorkbench = async () => { calls.push('launch'); throw Error('worker start failed') }
  await offerConfigReset({ reason: 'worker-startup-failed', rootPath: '/broken-root', host: recorder })
  assert.deepEqual(calls, ['launch', 'fatal'])
})

test('CR-04 a wipe failure goes fatal and never relaunches', async () => {
  const { calls, recorder } = host()
  recorder.wipe = async () => { calls.push('wipe'); throw Error('RESET_FAILED') }
  await offerConfigReset({ reason: 'repair-failed', rootPath: '/broken-root', host: recorder })
  assert.deepEqual(calls, ['launch', 'confirm', 'wipe', 'fatal'])
})
