import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, constants } from '../lib/index.js'

/** Live reference, the shape a volatile config field presents. */
function ref(read) {
  return { get: read }
}

/** Wait for the deferred reconcile and its serialized chain to settle. */
function settle() {
  return new Promise(resolve => setTimeout(resolve, 10))
}

/** Minimal Host context plus a live provider row for the all-prompts mode. */
function harness() {
  const state = {
    modelKind: 'native',
    provider: '',
    model: '',
    targetWords: 5,
    targetCjkCharacters: 10,
    tools: [],
    edits: [],
    handlers: new Map(),
    injectedServices: [],
  }
  const firstEntry = { options: { id: constants.FIRST_PROMPT_ROW, name: 'first-prompt-llm' } }
  const allEntry = {
    options: { id: constants.ALL_PROMPTS_ROW, name: 'all-prompts-llm' },
    fiber: { state: constants.FIBER_STATE_ACTIVE, effectiveConfig: { targetWords: 5, targetCjkCharacters: 10 } },
  }
  const mctx = {
    configEditor: {
      entries: () => [firstEntry, allEntry],
      edit: async (entry, change) => { state.edits.push({ id: entry.options.id, config: change({}, {}) }) },
    },
    get: () => undefined,
  }
  const ctx = {
    tools: {
      register(definition) {
        state.tools.push(definition)
        return () => {
          const index = state.tools.indexOf(definition)
          if (index >= 0) state.tools.splice(index, 1)
        }
      },
    },
    sessions: { get: () => undefined },
    sessionTitle: { get: () => undefined, rename: () => { throw new Error('unused') } },
    logger: { error() {}, warn() {} },
    effect(callback) {
      const dispose = callback()
      return () => { if (typeof dispose === 'function') dispose() }
    },
    on(event, callback, options) {
      const handlers = state.handlers.get(event) ?? []
      handlers.push({ callback, options })
      state.handlers.set(event, handlers)
      return () => {}
    },
    inject(services, callback) {
      state.injectedServices.push(services)
      callback(mctx)
      return () => {}
    },
    get: () => undefined,
  }
  const config = {
    modelKind: ref(() => state.modelKind),
    provider: ref(() => state.provider),
    model: ref(() => state.model),
    targetWords: ref(() => state.targetWords),
    targetCjkCharacters: ref(() => state.targetCjkCharacters),
  }
  const emit = (event, ...args) => {
    for (const { callback } of state.handlers.get(event) ?? []) callback(...args)
  }
  return { ctx, config, state, firstEntry, allEntry, emit }
}

test('registers both tools and follows a length change in the rename description', async () => {
  const h = harness()
  apply(h.ctx, h.config)
  assert.deepEqual(h.state.tools.map(tool => tool.name), ['session_title_read', 'session_title_set'])
  assert.match(h.state.tools[1].description, /about 5 words/)
  assert.deepEqual(h.state.injectedServices, [['configEditor']])

  h.state.targetWords = 8
  h.emit('loader/volatile-update', [['targetWords']])
  await settle()

  assert.deepEqual(h.state.tools.map(tool => tool.name), ['session_title_read', 'session_title_set'])
  assert.match(h.state.tools[1].description, /about 8 words/)
})

test('projects a custom route onto the running provider row', async () => {
  const h = harness()
  apply(h.ctx, h.config)
  h.state.modelKind = 'custom'
  h.state.provider = 'provider-a'
  h.state.model = 'model-a'
  h.emit('loader/volatile-update', [['modelKind'], ['provider'], ['model']])
  await settle()

  assert.equal(h.state.edits.length, 1)
  assert.equal(h.state.edits[0].id, constants.ALL_PROMPTS_ROW)
  assert.equal(h.state.edits[0].config.provider, 'provider-a')
  assert.equal(h.state.edits[0].config.model, 'model-a')
})

test('writes nothing when the running row already matches', async () => {
  const h = harness()
  apply(h.ctx, h.config)
  h.emit('loader/volatile-update', [['targetWords']])
  await settle()
  assert.equal(h.state.edits.length, 0)
})

test('reprojects when a recomposition switches the running provider row', async () => {
  const h = harness()
  apply(h.ctx, h.config)
  h.state.targetWords = 8
  h.emit('loader/volatile-update', [['targetWords']])
  await settle()
  assert.equal(h.state.edits.length, 1)
  assert.equal(h.state.edits[0].id, constants.ALL_PROMPTS_ROW)

  // The experimental bundle is switched off: the base row becomes the live one.
  h.allEntry.fiber = undefined
  h.firstEntry.fiber = { state: constants.FIBER_STATE_ACTIVE, effectiveConfig: { targetWords: 5, targetCjkCharacters: 10 } }
  h.emit('app-boot/config-reload')
  await settle()

  assert.equal(h.state.edits.length, 2)
  assert.equal(h.state.edits[1].id, constants.FIRST_PROMPT_ROW)
  assert.equal(h.state.edits[1].config.targetWords, 8)
})
