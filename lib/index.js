/**
 * Read or rename the current session title through two agent tools.
 *
 * Host-only bundle: registers two model-facing tools over the live Session
 * store and the `sessionTitle` service. No dependencies on any shipped package,
 * so the bundle activates cleanly from a local directory install.
 *
 * @module @local/dsh-session-title-tools
 */

/** Cordis plugin name. */
export const name = 'session-title-tools'

/** Services used by the tools. */
export const inject = ['tools', 'sessions', 'sessionTitle']

/**
 * Register the session-title tools for this composition.
 * @param {import('@deepseek-ai/cordis').Context} ctx - context providing the tool registry, session store, and title service.
 */
export function apply(ctx) {
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

  // Tool 2: set a new title.
  ctx.tools.register({
    name: 'session_title_set',
    description:
      'Rename this conversation session by setting a new title. The new title is pinned, so automatic title generation stops for later messages.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The new session title. Must be a non-empty string after trimming.' },
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
}
