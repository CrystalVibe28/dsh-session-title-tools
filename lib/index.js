/**
 * Session title tools and native session-title management.
 *
 * Host half: two model-facing tools over the live Session store and the
 * `sessionTitle` service, plus a reconciler that projects this plugin's
 * volatile configuration onto DSH's native session-title provider row and the
 * shipped experimental session-titles bundle. The tool half never depends on
 * the management services, so it keeps working in profiles without them.
 *
 * @module @local/dsh-session-title-tools
 */

import { createRequire } from 'node:module'
import { join } from 'node:path'

/** Cordis plugin name. */
export const name = 'session-title-tools'

/** Services used by the always-available tools. */
export const inject = ['tools', 'sessions', 'sessionTitle']

/** This plugin's profile entry id, also its settings namespace. */
const ENTRY_ID = 'session-title-tools'

/** Shipped bundle that replaces the first-prompt provider with all-prompts. */
const EXPERIMENTAL_BUNDLE = '@deepseek-ai/dsh-experimental-session-titles-bundle'

/** Built-in first-human-message provider row id. */
const FIRST_PROMPT_ROW = 'session-title-llm'

/** Row id the experimental bundle inserts for the all-prompts provider. */
const ALL_PROMPTS_ROW = 'optional-session-title-all-prompts'

/** Native defaults shipped by DSH 0.2.2-rc.3. */
const DEFAULT_TARGET_WORDS = 5
const DEFAULT_TARGET_CJK_CHARACTERS = 10

/**
 * Model-facing rename rules that mirror DSH's native first-prompt system
 * prompt, so the model calling `session_title_set` composes the title the same
 * way automatic generation would. The tool itself never calls a model.
 * @param targetWords - non-CJK word target from the current settings.
 * @param targetCjkCharacters - CJK character target from the current settings.
 * @returns the rules as a block of the tool description.
 */
function renameRules(targetWords, targetCjkCharacters) {
  return [
    'Write a concise title for the AI coding-assistant session from this conversation.',
    'Return only the title as one line of plain natural-language text, with no quotes, prefix, explanation, Markdown, XML, or terminal control codes. No code is allowed.',
    'Use the language of the messages.',
    `Aim for about ${targetWords} words in non-CJK languages or ${targetCjkCharacters} CJK characters.`,
    'If the messages give little to name, still pass a short best-effort title, such as Greeting, instead of explaining.',
  ].join('\n')
}

/**
 * Resolve `@deepseek-ai/schemastery` from the running DSH installation so the
 * bundle needs no profile dependency of its own.
 * @returns the schemastery factory, or undefined when no anchor resolves.
 */
function loadSchemastery() {
  const anchors = []
  if (typeof process.env.DSH_INSTALL_DIR === 'string' && process.env.DSH_INSTALL_DIR !== '') {
    anchors.push(join(process.env.DSH_INSTALL_DIR, 'package.json'))
  }
  if (typeof process.env.DSH_PROFILE_DIR === 'string' && process.env.DSH_PROFILE_DIR !== '') {
    anchors.push(join(process.env.DSH_PROFILE_DIR, 'package.json'))
  }
  anchors.push(import.meta.url)
  if (typeof process.argv[1] === 'string' && process.argv[1] !== '') {
    anchors.push(process.argv[1])
  }
  for (const anchor of anchors) {
    try {
      const require = createRequire(anchor)
      const module = require('@deepseek-ai/schemastery')
      return module.default ?? module
    } catch {
      // Try the next anchor.
    }
  }
  return undefined
}

const z = loadSchemastery()

/**
 * Volatile configuration projected by the management page. Every field is
 * volatile so the browser can edit it live over the standard settings form.
 */
export const Config = z === undefined ? undefined : z.object({
  /** `auto` leaves the native bundle switch untouched. */
  mode: z.union([z.const('auto'), z.const('first-prompt'), z.const('all-prompts')])
    .default('auto')
    .description('Native title generation mode.')
    .volatile(),
  /** Whether titles use the session's own model or an explicit route. */
  modelKind: z.union([z.const('native'), z.const('custom')])
    .default('native')
    .description('Native title model selection.')
    .volatile(),
  /** Explicit provider route used when `modelKind` is `custom`. */
  provider: z.string()
    .default('')
    .description('Title model provider.')
    .volatile(),
  /** Explicit model id used when `modelKind` is `custom`. */
  model: z.string()
    .default('')
    .description('Title model id.')
    .volatile(),
  /** Non-CJK word target baked into the native system prompt. */
  targetWords: z.number()
    .step(1)
    .min(1)
    .default(DEFAULT_TARGET_WORDS)
    .description('Target words for non-CJK titles.')
    .volatile(),
  /** CJK character target baked into the native system prompt. */
  targetCjkCharacters: z.number()
    .step(1)
    .min(1)
    .default(DEFAULT_TARGET_CJK_CHARACTERS)
    .description('Target characters for CJK titles.')
    .volatile(),
})

/**
 * Read one volatile field defensively.
 * @param config - resolved plugin configuration.
 * @param field - field name.
 * @param fallback - value used when the field is absent.
 * @returns the current field value.
 */
function readField(config, field, fallback) {
  const reference = config?.[field]
  if (reference !== undefined && typeof reference.get === 'function') {
    const value = reference.get()
    return value === undefined ? fallback : value
  }
  return fallback
}

/**
 * Snapshot the plugin configuration.
 * @param config - resolved plugin configuration.
 * @returns plain values.
 */
function readConfig(config) {
  return {
    mode: readField(config, 'mode', 'auto'),
    modelKind: readField(config, 'modelKind', 'native'),
    provider: readField(config, 'provider', ''),
    model: readField(config, 'model', ''),
    targetWords: readField(config, 'targetWords', DEFAULT_TARGET_WORDS),
    targetCjkCharacters: readField(config, 'targetCjkCharacters', DEFAULT_TARGET_CJK_CHARACTERS),
  }
}

/**
 * Register the session-title tools and the native title reconciler.
 * @param ctx - context providing the tool registry, session store, and title service.
 * @param config - this plugin's volatile configuration.
 */
export function apply(ctx, config) {
  const values = readConfig(config)
  const renameRulesText = renameRules(values.targetWords, values.targetCjkCharacters)

  // Resolve the live Session that owns the calling agent.
  function requireSession(exec) {
    if (exec.agent === undefined) {
      throw new Error('session-title tools require an agent Session')
    }
    const session = ctx.sessions.get(exec.agent.id)
    if (session === undefined) {
      throw new Error(`no live session for agent ${exec.agent.id}`)
    }
    return session
  }

  // Tool 1: read the current title.
  ctx.tools.register({
    name: 'session_title_read',
    description:
      'Read the current title of this conversation session. Returns the title text, or an empty string when no title has been set yet.',
    parameters: {
      type: 'object',
      properties: {},
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Current session title; empty string when unset.' },
        },
        required: ['title'],
      },
      render: (_args, value) => [{ type: 'text', text: value.title === '' ? '(no title)' : value.title }],
    },
    async execute(_args, exec) {
      const session = requireSession(exec)
      const snapshot = ctx.sessionTitle.get(session)
      return { title: snapshot?.title ?? '' }
    },
  })

  // Tool 2: rename with a title the calling model generates itself.
  ctx.tools.register({
    name: 'session_title_set',
    description: [
      'Rename this conversation session by passing the title you generated from this conversation.',
      "Follow DSH's native session-title rules:",
      renameRulesText,
      'Pass the title as `title`. The new title is pinned: automatic title generation stops for later messages.',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title you generated from this conversation. Must be a non-empty string after trimming.' },
      },
      required: ['title'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'The accepted session title.' },
        },
        required: ['title'],
      },
      render: (_args, value) => [{ type: 'text', text: `Session title set to "${value.title}"` }],
    },
    async execute(args, exec) {
      const session = requireSession(exec)
      const title = typeof args.title === 'string' ? args.title.trim() : ''
      if (title === '') {
        throw new Error('title must be a non-empty string')
      }
      const snapshot = ctx.sessionTitle.rename(session, title)
      return { title: snapshot.title }
    },
  })

  if (config === undefined) return

  /** Management state supplied once the optional services are available. */
  let management

  ctx.inject(['configEditor', 'pluginManager'], (mctx) => {
    let scheduled = false
    /** Groups changed since the last reconcile: `mode`, `model`, `prompt`. */
    let pending = new Set()
    /** Serializes reconciles so two settings writes cannot interleave native edits. */
    let chain = Promise.resolve()

    /**
     * Find the active native title-provider entry.
     * @returns the live provider row, or undefined when no provider is running.
     */
    async function findActiveProviderEntry() {
      const bundles = await mctx.pluginManager.listBundles()
      const entries = mctx.configEditor.entries()
      for (const bundle of bundles) {
        for (const row of bundle.rows ?? []) {
          if (row.entryId === undefined) continue
          if (row.rowId !== FIRST_PROMPT_ROW && row.rowId !== ALL_PROMPTS_ROW) continue
          const entry = entries.find(candidate =>
            candidate.options.id === row.rowId && candidate.options.name === row.moduleName)
          if (entry !== undefined) return entry
        }
      }
      // Fallback for a composition whose bundle inventory omits the row: pick
      // the live entry among the two known provider rows (FiberState.ACTIVE = 2).
      for (const entry of entries) {
        if (entry.options.id !== FIRST_PROMPT_ROW && entry.options.id !== ALL_PROMPTS_ROW) continue
        if (entry.fiber !== undefined && entry.fiber.state === 2) return entry
      }
      return undefined
    }

    /**
     * Project the current plugin configuration onto the native provider row and
     * the shipped experimental bundle.
     * @param groups - configuration groups that changed.
     * @returns fulfillment after native state matches the request.
     */
    async function reconcile(groups) {
      const values = readConfig(config)
      let modeChanged = false

      if (groups.has('mode') && values.mode !== 'auto') {
        const wantEnabled = values.mode === 'all-prompts'
        const bundles = await mctx.pluginManager.listBundles()
        const bundle = bundles.find(candidate => candidate.name === EXPERIMENTAL_BUNDLE)
        if (bundle !== undefined && bundle.enabled !== wantEnabled) {
          const result = await mctx.pluginManager.setBundleEnabled(EXPERIMENTAL_BUNDLE, wantEnabled)
          if (result !== undefined && result.application === 'failed') {
            throw new Error(`could not ${wantEnabled ? 'enable' : 'disable'} ${EXPERIMENTAL_BUNDLE}: ${result.error?.message ?? 'unknown failure'}`)
          }
          modeChanged = true
        }
      }

      if (!modeChanged && !groups.has('model') && !groups.has('prompt')) return

      const entry = await findActiveProviderEntry()
      if (entry === undefined) {
        throw new Error('no active session-title provider row was found')
      }

      const explicit = values.modelKind === 'custom' && values.provider !== '' && values.model !== ''
      const desired = {
        targetWords: values.targetWords,
        targetCjkCharacters: values.targetCjkCharacters,
        provider: explicit ? values.provider : undefined,
        model: explicit ? values.model : undefined,
      }
      const current = entry.fiber?.effectiveConfig ?? {}
      const unchanged = current.targetWords === desired.targetWords
        && current.targetCjkCharacters === desired.targetCjkCharacters
        && (current.provider ?? undefined) === desired.provider
        && (current.model ?? undefined) === desired.model
      if (unchanged) return

      await mctx.configEditor.edit(entry, (raw) => {
        const next = {
          ...raw,
          targetWords: desired.targetWords,
          targetCjkCharacters: desired.targetCjkCharacters,
        }
        if (desired.provider !== undefined && desired.model !== undefined) {
          next.provider = desired.provider
          next.model = desired.model
        } else {
          delete next.provider
          delete next.model
        }
        return next
      })
    }

    /**
     * Run a synchronous scheduler outside the HMR transaction that emitted the
     * volatile update. `configEditor.edit` and `pluginManager.setBundleEnabled`
     * both acquire `hmr.runExclusive`, which rejects nested transactions; the
     * HMR service's own `AsyncLocalStorage.exit` is the supported escape it
     * uses for its watchers.
     * @param operation - schedules the asynchronous reconcile.
     */
    function defer(operation) {
      const hmr = mctx.get('hmr')
      const executing = hmr?.executing
      if (executing !== undefined && typeof executing.exit === 'function') {
        executing.exit(operation)
        return
      }
      queueMicrotask(operation)
    }

    /**
     * Queue one reconcile for the changed configuration groups.
     * @param paths - changed field paths reported by the Loader.
     */
    function schedule(paths) {
      for (const path of paths ?? []) {
        const head = path?.[0]
        if (head === 'mode') pending.add('mode')
        else if (head === 'modelKind' || head === 'provider' || head === 'model') pending.add('model')
        else if (head === 'targetWords' || head === 'targetCjkCharacters') pending.add('prompt')
      }
      if (scheduled) return
      scheduled = true
      defer(() => {
        scheduled = false
        const groups = pending
        pending = new Set()
        enqueue(groups)
      })
    }

    /**
     * Queue one reconcile behind the serialized chain.
     * @param groups - configuration groups to project.
     */
    function enqueue(groups) {
      chain = chain
        .then(() => reconcile(groups))
        .catch((error) => {
          ctx.logger.warn('session-title-tools: native title settings were not applied')
          ctx.logger.warn(error)
        })
    }

    management = { schedule }

    // Reapply an explicit selection after a restart or a mode-driven profile
    // recomposition. A default (auto/native/default targets) configuration is
    // left alone so first activation never overwrites native custom values.
    const initial = readConfig(config)
    const activationGroups = new Set()
    if (initial.mode !== 'auto') activationGroups.add('mode')
    if (initial.modelKind === 'custom' && initial.provider !== '' && initial.model !== '') activationGroups.add('model')
    if (initial.targetWords !== DEFAULT_TARGET_WORDS
      || initial.targetCjkCharacters !== DEFAULT_TARGET_CJK_CHARACTERS) activationGroups.add('prompt')
    if (activationGroups.size > 0) defer(() => { enqueue(activationGroups) })

    return () => {
      management = undefined
    }
  })

  // `loader/volatile-update` is emitted on this plugin's own fiber context, so
  // the listener lives here rather than on the injected child context.
  ctx.effect(
    () => ctx.on('loader/volatile-update', (paths) => { management?.schedule(paths) }),
    'session-title-tools: native title setting projection',
  )
}

/** Exported for tests and documentation. */
export const constants = {
  ENTRY_ID,
  EXPERIMENTAL_BUNDLE,
  FIRST_PROMPT_ROW,
  ALL_PROMPTS_ROW,
  DEFAULT_TARGET_WORDS,
  DEFAULT_TARGET_CJK_CHARACTERS,
}
