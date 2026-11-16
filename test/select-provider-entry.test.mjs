import assert from 'node:assert/strict'
import test from 'node:test'
import { constants, selectActiveProviderEntry } from '../lib/index.js'

/** Entry shape the config editor exposes for one profile row. */
function entry(id, name, state) {
  return {
    options: { id, name },
    ...(state === undefined ? {} : { fiber: { state } }),
  }
}

const FIRST = constants.FIRST_PROMPT_ROW
const ALL = constants.ALL_PROMPTS_ROW
const FIRST_NAME = '@deepseek-ai/dsh-session-title-first-prompt-llm'
const ALL_NAME = '@deepseek-ai/dsh-session-title-all-prompts-llm'

test('picks the live all-prompts row when the first-prompt row is disabled', () => {
  const picked = selectActiveProviderEntry([
    entry(FIRST, FIRST_NAME),
    entry(ALL, ALL_NAME, constants.FIBER_STATE_ACTIVE),
  ])
  assert.equal(picked.options.id, ALL)
})

test('picks the live first-prompt row when the experimental bundle is off', () => {
  const picked = selectActiveProviderEntry([
    entry(FIRST, FIRST_NAME, constants.FIBER_STATE_ACTIVE),
    entry(ALL, ALL_NAME),
  ])
  assert.equal(picked.options.id, FIRST)
})

test('does not treat a stopped or failed fiber as editable', () => {
  const picked = selectActiveProviderEntry([
    entry(FIRST, FIRST_NAME, 3),
    entry(ALL, ALL_NAME, 4),
  ])
  assert.equal(picked, undefined)
})

test('returns undefined when neither provider row is addressable', () => {
  assert.equal(selectActiveProviderEntry([entry('some-other-row', 'pkg', 2)]), undefined)
})

test('ignores unrelated rows even when they are live', () => {
  const picked = selectActiveProviderEntry([
    entry('some-other-row', 'pkg', constants.FIBER_STATE_ACTIVE),
    entry(ALL, ALL_NAME, constants.FIBER_STATE_ACTIVE),
  ])
  assert.equal(picked.options.id, ALL)
})

test('breaks a tie with the module name a bundle declares', () => {
  const declared = new Map([[ALL, ALL_NAME]])
  const picked = selectActiveProviderEntry([
    entry(FIRST, 'unexpected-package', constants.FIBER_STATE_ACTIVE),
    entry(ALL, ALL_NAME, constants.FIBER_STATE_ACTIVE),
  ], declared)
  assert.equal(picked.options.id, ALL)
})
