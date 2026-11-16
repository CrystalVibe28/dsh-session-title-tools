/**
 * Session title tools and native session-title management.
 *
 * Host half: two model-facing tools over the live Session store and the
 * `sessionTitle` service, plus a reconciler that projects this plugin's
 * volatile model and length settings onto whichever native session-title
 * provider row is actually running. The tools never depend on the management
 * service, so they keep working in profiles without it.
 *
 * The generation mode (first-prompt vs all-prompts) is the shipped
 * experimental bundle's own switch. The settings page owns it through the
 * native plugin-manager remote, so this half never toggles a bundle and never
 * re-asserts a mode at startup.
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

/** Built-in first-human-message provider row id. */
const FIRST_PROMPT_ROW = 'session-title-llm'

/** Row id the experimental bundle inserts for the all-prompts provider. */
const ALL_PROMPTS_ROW = 'optional-session-title-all-prompts'

/** The two row ids a native title provider can occupy. */
const PROVIDER_ROW_IDS = new Set([FIRST_PROMPT_ROW, ALL_PROMPTS_ROW])

/** `FiberState.ACTIVE` from `@deepseek-ai/cordis`, which this package does not depend on. */
const FIBER_STATE_ACTIVE = 2

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
    modelKind: readField(config, 'modelKind', 'native'),
    provider: readField(config, 'provider', ''),
    model: readField(config, 'model', ''),
    targetWords: readField(config, 'targetWords', DEFAULT_TARGET_WORDS),
    targetCjkCharacters: readField(config, 'targetCjkCharacters', DEFAULT_TARGET_CJK_CHARACTERS),
  }
}

/**
 * Pick the live native title-provider entry among the two known rows. A
 * disabled row keeps its Loader entry with no fiber, so the entry existing is
 * not enough: only an ACTIVE fiber can receive configuration edits.
 * @param entries - uniquely addressed profile entries from the config editor.
 * @param declaredRows - row id to module name from the bundle inventory, used
 * only to break a tie when both provider rows are live.
 * @returns the entry to edit, or undefined when no provider is running.
 */
export function selectActiveProviderEntry(entries, declaredRows = new Map()) {
  const live = entries.filter(entry =>
    PROVIDER_ROW_IDS.has(entry.options?.id)
    && entry.fiber !== undefined
    && entry.fiber.state === FIBER_STATE_ACTIVE)
  if (live.length <= 1) return live[0]
  for (const entry of live) {
    const moduleName = declaredRows.get(entry.options.id)
    if (moduleName !== undefined && moduleName === entry.options.name) return entry
  }
  return live[0]
}

/**
 * Register the session-title tools and, when the profile offers the
 * configuration editor, the reconciler that projects model and length settings
 * onto the live native provider.
 * @param ctx - context providing the tool registry, session store, and title service.
 * @param config - this plugin's volatile configuration.
 */
export function apply(ctx, config) {
  /** Disposer for the currently registered tool pair. */
  let disposeTools = () => {}

  /**
   * Register both tools with the current length targets baked into the
   * rename description.
   * @returns the disposer that unregisters the pair.
   */
  function registerTools() {
    const values = readConfig(config)
    const rules = renameRules(values.targetWords, values.targetCjkCharacters)
    const disposeRead = ctx.tools.register({
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
    const disposeSet = ctx.tools.register({
      name: 'session_title_set',
      description: [
        'Rename this conversation session by passing the title you generated from this conversation.',
        "Follow DSH's native session-title rules:",
        rules,
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
    return () => {
      disposeSet()
      disposeRead()
    }
  }

  /**
   * Replace the tool pair so `session_title_set` describes the length targets
   * the page just saved. Runs outside the settings write, so registration is
   * never nested inside a Loader transaction.
   */
  function refreshTools() {
    try {
      disposeTools()
      disposeTools = registerTools()
    } catch (error) {
      ctx.logger.error('session-title-tools: tool descriptions were not refreshed')
      ctx.logger.error(error)
    }
  }

  disposeTools = registerTools()

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

  if (config === undefined) return

  /** Management state supplied once the optional service is available. */
  let management

  ctx.inject(['configEditor'], (mctx) => {
    let scheduled = false
    /** Groups changed since the last reconcile: `model`, `prompt`. */
    let pending = new Set()
    /** Serializes reconciles so two settings writes cannot interleave native edits. */
    let chain = Promise.resolve()
    /** Provider row id projected last, used to notice a generation-mode switch. */
    let lastProviderRowId

    /**
     * Find the running native title-provider entry.
     * @returns the live entry to edit.
     * @throws when neither known provider row is running.
     */
    function findActiveProviderEntry() {
      const entries = mctx.configEditor.entries()
      const entry = selectActiveProviderEntry(entries)
      if (entry !== undefined) return entry
      const states = entries
        .filter(candidate => PROVIDER_ROW_IDS.has(candidate.options?.id))
        .map(candidate => `${candidate.options.id}=${candidate.fiber === undefined ? 'stopped' : `state ${candidate.fiber.state}`}`)
        .join(', ')
      throw new Error(`no active session-title provider row was found (${states === '' ? 'neither known provider row is addressable' : states})`)
    }

    /**
     * Project the current model and length settings onto the live provider row.
     * @param groups - configuration groups that changed.
     * @returns fulfillment after native state matches the request.
     */
    async function reconcile(groups) {
      if (!groups.has('model') && !groups.has('prompt')) return

      const values = readConfig(config)
      const entry = findActiveProviderEntry()
      lastProviderRowId = entry.options.id
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
     * volatile update. `configEditor.edit` acquires `hmr.runExclusive`, which
     * rejects nested transactions; the HMR service's own `AsyncLocalStorage.exit`
     * is the supported escape it uses for its watchers.
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
        if (head === 'modelKind' || head === 'provider' || head === 'model') pending.add('model')
        else if (head === 'targetWords' || head === 'targetCjkCharacters') pending.add('prompt')
      }
      if (scheduled) return
      scheduled = true
      defer(() => {
        scheduled = false
        const groups = pending
        pending = new Set()
        if (groups.has('prompt')) refreshTools()
        enqueue(groups)
      })
    }

    /**
     * Queue one reconcile behind the serialized chain.
     * @param groups - configuration groups to project.
     */
    function enqueue(groups) {
      const label = groups.size === 0 ? 'no groups' : [...groups].join(', ')
      chain = chain
        .then(() => reconcile(groups))
        .catch((error) => {
          ctx.logger.error('session-title-tools: native session-title settings were not applied (%s)', label)
          ctx.logger.error(error)
        })
    }

    /**
     * Project settings again only when a recomposition switched the running
     * provider row, which is what a generation-mode change does. Re-projecting
     * on every reload could fight a value no write can satisfy (for example a
     * provider route pinned by a home patch), so the row identity gates it.
     */
    function reapplyIfProviderChanged() {
      try {
        if (findActiveProviderEntry().options.id === lastProviderRowId) return
      } catch {
        // No provider is running; there is nothing to project onto.
        return
      }
      schedule([['modelKind']])
    }

    management = { schedule, reapplyIfProviderChanged }

    // Reapply an explicit model or length selection after a restart or a
    // profile recomposition. The generation mode is deliberately absent: it is
    // the shipped bundle's switch, owned by the settings page, so startup never
    // re-asserts a mode and a manual change on DSH's Plugins page survives.
    const initial = readConfig(config)
    const activationGroups = new Set()
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

  // A profile recomposition can change which provider row is running: that is
  // how a generation-mode switch takes effect. Project the model and length
  // settings onto the new row, and leave the mode itself alone.
  ctx.effect(
    () => ctx.on('app-boot/config-reload', () => { management?.reapplyIfProviderChanged() }, { global: true }),
    'session-title-tools: reapply after a composition reload',
  )
}

/** Exported for tests and documentation. */
export const constants = {
  ENTRY_ID,
  FIRST_PROMPT_ROW,
  ALL_PROMPTS_ROW,
  PROVIDER_ROW_IDS,
  FIBER_STATE_ACTIVE,
  DEFAULT_TARGET_WORDS,
  DEFAULT_TARGET_CJK_CHARACTERS,
}
