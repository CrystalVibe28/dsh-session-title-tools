window.__ModuleLoader__.load({
  id: '@local/dsh-session-title-tools',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState, useSyncExternalStore } = React

    /** Client locale namespace owned by this plugin. */
    const NS = 'sessionTitleTools'
    /** Host entry id, which is also the settings namespace. */
    const ENTRY_ID = 'session-title-tools'
    /** Bundle that selects the all-prompts title provider. */
    const EXPERIMENTAL_BUNDLE = '@deepseek-ai/dsh-experimental-session-titles-bundle'
    /** Native defaults shipped by DSH 0.2.2-rc.3. */
    const DEFAULT_TARGET_WORDS = 5
    const DEFAULT_TARGET_CJK_CHARACTERS = 10

    const en = {
      tabLabel: 'Session title',
      title: 'Session title generation',
      intro: "Manage DSH's native session-title generation: model, prompt length, and mode. Changes are written to the native settings.",
      modeTitle: 'Generation mode',
      modeHint: "Switch DSH's built-in title provider. This changes the experimental bundle's enabled state, which DSH's Plugins page reflects too.",
      modeFirstPrompt: 'First prompt (first-prompt)',
      modeFirstPromptHint: 'Generate a title once, from the first user message of a brand-new session.',
      modeAllPrompts: 'Every prompt (all-prompts)',
      modeAllPromptsHint: 'Every eligible user message may update the title; an adequate generated title is kept verbatim.',
      modeActual: 'Current mode',
      modeUnknown: 'Loading…',
      modelTitle: 'Title model',
      modelHint: "Native follows the session's running model; custom pins an exact route from the available models.",
      modelNative: 'Follow the session model',
      modelNativeHint: "Use the same provider/model as the session's main request.",
      modelCustom: 'Custom model',
      modelCustomHint: 'Give title requests their own provider/model route.',
      modelCatalogLoading: 'Loading available models…',
      modelCatalogError: 'Could not load the model list.',
      modelCatalogRetry: 'Retry',
      modelUnavailable: 'The current setting is not in the available list',
      modelEmpty: 'No available models were found.',
      promptTitle: 'Native system prompt',
      promptHint: 'DSH composes its native prompt from these two length targets; changing them writes the native provider configuration.',
      promptWords: 'Target words (non-CJK)',
      promptCjk: 'Target CJK characters',
      promptPreview: 'Prompt preview',
      promptPreviewHint: 'This is the system prompt DSH sends to the title model with the current settings.',
      promptAnchor: 'Extra rules when updating an existing title (all-prompts)',
      promptRestore: 'Restore native defaults',
      promptApply: 'Apply length settings',
      saved: 'Saved.',
      writeFailed: 'The write failed; try again.',
      applying: 'Applying…',
      rowSummary: 'Manage the native session-title generation.',
      loading: 'Loading…',
      unavailable: 'This environment does not expose the settings form.',
      modeApplied: 'Generation mode updated.',
      modelApplied: 'Title model updated.',
      promptApplied: 'Prompt length settings updated.',
      restored: 'Restored the native defaults.',
      modeToggling: 'Switching mode…',
    }

    const zh = {
      tabLabel: '会话标题',
      title: '会话标题生成',
      intro: '管理 DSH 原生的会话标题生成：模型、提示词长度与生成模式。变更会直接写入原生设置。',
      modeTitle: '生成模式',
      modeHint: '切换 DSH 内置的标题提供者。这会变更实验性插件的启用状态，DSH 的插件页面也会同步显示。',
      modeFirstPrompt: '首条提示（first-prompt）',
      modeFirstPromptHint: '仅在全新会话的第一条用户消息时生成一次标题。',
      modeAllPrompts: '每条提示（all-prompts）',
      modeAllPromptsHint: '每条符合条件的用户消息都可能更新标题，既有生成标题若仍贴切会逐字保留。',
      modeActual: '当前模式',
      modeUnknown: '读取中…',
      modelTitle: '标题生成模型',
      modelHint: '原生模式沿用会话运行中的模型；自定义模式则从可用模型清单挑选固定路由。',
      modelNative: '跟随会话模型',
      modelNativeHint: '与当前会话主请求使用同一个 provider／model。',
      modelCustom: '自定义模型',
      modelCustomHint: '为标题请求指定独立的 provider／model。',
      modelCatalogLoading: '正在加载可用模型…',
      modelCatalogError: '无法加载模型清单。',
      modelCatalogRetry: '重试',
      modelUnavailable: '当前设置不在可用清单中',
      modelEmpty: '找不到可用的模型。',
      promptTitle: '原生系统提示词',
      promptHint: 'DSH 会用这两个长度目标组成原生提示词；调整后会写入原生 provider 设置。',
      promptWords: '非 CJK 目标词数',
      promptCjk: 'CJK 目标字数',
      promptPreview: '提示词预览',
      promptPreviewHint: '以下是目前设置下 DSH 实际送给标题模型的系统提示词。',
      promptAnchor: '更新既有标题时的附加规则（all-prompts）',
      promptRestore: '复原为原生默认',
      promptApply: '套用长度设置',
      saved: '已保存。',
      writeFailed: '保存失败，请重试。',
      applying: '套用中…',
      rowSummary: '管理原生会话标题生成。',
      loading: '加载中…',
      unavailable: '当前设置环境未提供此设置表单。',
      modeApplied: '生成模式已更新。',
      modelApplied: '标题模型已更新。',
      promptApplied: '提示词长度已更新。',
      restored: '已复原为原生默认值。',
      modeToggling: '正在切换模式…',
    }

    const zhTW = {
      tabLabel: '會話標題',
      title: '會話標題生成',
      intro: '管理 DSH 原生的會話標題生成：模型、提示詞長度與生成模式。變更會直接寫入原生設定。',
      modeTitle: '生成模式',
      modeHint: '切換 DSH 內建的標題提供者。這會變更實驗性外掛的啟用狀態，DSH 的外掛頁面也會同步顯示。',
      modeFirstPrompt: '首則提示（first-prompt）',
      modeFirstPromptHint: '僅在全新會話的第一則使用者訊息時生成一次標題。',
      modeAllPrompts: '每則提示（all-prompts）',
      modeAllPromptsHint: '每次符合條件的使用者訊息都可能更新標題，既有生成標題若仍貼切會逐字保留。',
      modeActual: '目前模式',
      modeUnknown: '讀取中…',
      modelTitle: '標題生成模型',
      modelHint: '原生模式會沿用會話執行中的模型；自訂模式則從可用模型清單挑選固定路由。',
      modelNative: '跟隨會話模型',
      modelNativeHint: '與目前會話主請求使用同一個 provider／model。',
      modelCustom: '自訂模型',
      modelCustomHint: '為標題請求指定獨立的 provider／model。',
      modelCatalogLoading: '正在載入可用模型…',
      modelCatalogError: '無法載入模型清單。',
      modelCatalogRetry: '重試',
      modelUnavailable: '目前設定不在可用清單中',
      modelEmpty: '找不到可用的模型。',
      promptTitle: '原生系統提示詞',
      promptHint: 'DSH 會用這兩個長度目標組成原生提示詞；調整後會寫入原生 provider 設定。',
      promptWords: '非 CJK 目標詞數',
      promptCjk: 'CJK 目標字數',
      promptPreview: '提示詞預覽',
      promptPreviewHint: '以下為目前設定下 DSH 實際送給標題模型的系統提示詞。',
      promptAnchor: '更新既有標題時的附加規則（all-prompts）',
      promptRestore: '復原為原生預設',
      promptApply: '套用長度設定',
      saved: '已儲存。',
      writeFailed: '儲存失敗，請重試。',
      applying: '套用中…',
      rowSummary: '管理原生會話標題生成。',
      loading: '載入中…',
      unavailable: '目前設定環境未提供此設定表單。',
      modeApplied: '生成模式已更新。',
      modelApplied: '標題模型已更新。',
      promptApplied: '提示詞長度已更新。',
      restored: '已復原為原生預設值。',
      modeToggling: '正在切換模式…',
    }

    /** Native prompt lines that do not depend on the mode. */
    function basePrompt(targetWords, targetCjkCharacters) {
      return [
        'Create a concise title for an AI coding-assistant session from the supplied human messages.',
        'Return only the title on one line, **in plain text of natural language**, with no quotes, prefix, explanation, Markdown, XML, or terminal control codes. No code is allowed.',
        'Use the language of the messages.',
        `Aim for about ${targetWords} words in non-CJK languages or ${targetCjkCharacters} CJK characters.`,
        'If the messages give little to name, still return a short best-effort title, such as Greeting, instead of explaining.',
      ].join('\n')
    }

    /** Extra all-prompts rules that only apply once a provider title exists. */
    const anchorPrompt = [
      'An existing title is supplied as currentTitle. If it still accurately describes the main topic or task, return it exactly unchanged.',
      'Follow-up questions, additional details within the same topic, acknowledgements such as "thanks", and requests to continue do not by themselves justify a title change.',
      'Do not reword, polish, shorten, or replace synonyms in an adequate title. Keeping its exact wording takes priority over the target length.',
      'Change the title only when the messages materially change or expand the main topic or task so that the existing title is no longer accurate.',
    ].join('\n')

    const css = `
.stt-page { display: flex; flex-direction: column; gap: 14px; color: var(--dsw-alias-label-primary); }
.stt-heading { margin: 0; font-size: 18px; font-weight: 600; }
.stt-intro { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.6; }
.stt-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 16px; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; gap: 10px; }
.stt-card-title { margin: 0; font-size: 14px; font-weight: 600; }
.stt-hint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; }
.stt-unknown { color: var(--dsw-alias-state-warn-primary); }
.stt-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.stt-mode { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; padding: 12px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: inherit; cursor: pointer; font: inherit; }
.stt-mode[aria-pressed="true"] { border-color: var(--dsw-alias-brand-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); }
.stt-mode:disabled { cursor: default; opacity: 0.6; }
.stt-mode-title { font-size: 13px; font-weight: 600; }
.stt-mode-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.5; }
.stt-choices { display: flex; flex-direction: column; gap: 8px; }
.stt-choice { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); cursor: pointer; }
.stt-choice[data-active="true"] { border-color: var(--dsw-alias-brand-primary); }
.stt-choice input { margin-top: 2px; accent-color: var(--dsw-alias-brand-primary); }
.stt-choice-body { display: flex; flex-direction: column; gap: 2px; }
.stt-choice-title { font-size: 13px; font-weight: 600; }
.stt-choice-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.5; }
.stt-models { display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow: auto; padding: 4px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); }
.stt-group { display: flex; flex-direction: column; gap: 2px; }
.stt-group-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dsw-alias-label-secondary); padding: 4px 6px; }
.stt-model { display: flex; gap: 8px; align-items: baseline; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.stt-model:hover { background: var(--dsw-alias-bg-layer-1); }
.stt-model input { accent-color: var(--dsw-alias-brand-primary); }
.stt-model-name { font-size: 13px; }
.stt-model-route { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.stt-targets { display: flex; flex-wrap: wrap; gap: 12px; }
.stt-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.stt-field input { width: 120px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; }
.stt-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.stt-button { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer; }
.stt-button:disabled { opacity: 0.55; cursor: default; }
.stt-button-primary { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
.stt-preview { margin: 0; padding: 12px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow: auto; }
.stt-anchor { margin: 0; padding: 12px; border-radius: 10px; border: 1px dashed var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.stt-notice { padding: 8px 12px; border-radius: 8px; font-size: 12px; border: 1px solid var(--dsw-alias-border-l1); }
.stt-notice-ok { color: var(--dsw-alias-state-success-primary); }
.stt-notice-error { color: var(--dsw-alias-state-error-primary); }
.stt-notice-warn { color: var(--dsw-alias-state-warn-primary); }
.stt-loading { color: var(--dsw-alias-label-secondary); font-size: 13px; }
`

    function Card(props) {
      return h('section', { className: 'stt-card' },
        h('h3', { className: 'stt-card-title' }, props.title),
        props.hint === undefined ? null : h('p', { className: 'stt-hint' }, props.hint),
        props.children,
      )
    }

    function Notice(props) {
      if (props.notice === null) return null
      return h('p', {
        className: `stt-notice stt-notice-${props.notice.kind === 'ok' ? 'ok' : props.notice.kind === 'warn' ? 'warn' : 'error'}`,
        role: props.notice.kind === 'error' ? 'alert' : 'status',
      }, props.notice.text)
    }

    function SessionTitlePage(props) {
      const { t, ctx } = props
      const form = ctx.configForms.get(ENTRY_ID)
      const subscribe = useCallback(callback => form.subscribe(callback), [form])
      const getSnapshot = useCallback(() => form.getSnapshot(), [form])
      const snapshot = useSyncExternalStore(subscribe, getSnapshot)
      const value = snapshot.value ?? {}

      const [catalog, setCatalog] = useState({ status: 'idle', groups: [] })
      const [catalogNonce, setCatalogNonce] = useState(0)
      const [actualMode, setActualMode] = useState(undefined)
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState(null)
      const [words, setWords] = useState(String(value.targetWords ?? DEFAULT_TARGET_WORDS))
      const [cjk, setCjk] = useState(String(value.targetCjkCharacters ?? DEFAULT_TARGET_CJK_CHARACTERS))
      const [modeBusy, setModeBusy] = useState(false)

      // Keep the length inputs in step with an accepted settings write.
      const revision = snapshot.revision
      const effectiveWords = value.targetWords ?? DEFAULT_TARGET_WORDS
      const effectiveCjk = value.targetCjkCharacters ?? DEFAULT_TARGET_CJK_CHARACTERS
      useEffect(() => {
        setWords(String(effectiveWords))
        setCjk(String(effectiveCjk))
      }, [revision, effectiveWords, effectiveCjk])

      // The model catalogue is independent of any settings namespace.
      useEffect(() => {
        let alive = true
        const load = async () => {
          setCatalog((previous) => ({ ...previous, status: 'loading' }))
          try {
            const response = await ctx.remote.session.modelCatalog()
            if (!alive) return
            if (response.ok) {
              setCatalog({ status: 'ready', groups: response.value.groups ?? [] })
            } else {
              setCatalog({ status: 'error', groups: [] })
            }
          } catch {
            if (alive) setCatalog({ status: 'error', groups: [] })
          }
        }
        void load()
        let off = () => {}
        try {
          off = ctx.remote.$on('llm/adapters-updated', () => { void load() })
        } catch {
          // The event is optional; the page still works without it.
        }
        return () => { alive = false; off() }
      }, [ctx, catalogNonce])

      // The authoritative generation mode is the shipped bundle's own switch.
      useEffect(() => {
        let alive = true
        const load = async () => {
          try {
            const response = await ctx.remote.pluginManager.listBundles()
            if (!alive || !response.ok) return
            const bundle = response.value.find(candidate => candidate.name === EXPERIMENTAL_BUNDLE)
            setActualMode(bundle?.enabled === true ? 'all-prompts' : 'first-prompt')
          } catch {
            if (alive) setActualMode(undefined)
          }
        }
        void load()
        let off = () => {}
        try {
          off = ctx.remote.$on('plugin-manager/changed', () => { void load() })
        } catch {
          // The event is optional; the page still works without it.
        }
        return () => { alive = false; off() }
      }, [ctx])

      useEffect(() => {
        if (notice === null) return
        const timer = setTimeout(() => { setNotice(null) }, 4000)
        return () => { clearTimeout(timer) }
      }, [notice])

      const mutate = useCallback(async (ops, successText) => {
        setBusy(true)
        setNotice(null)
        try {
          const accepted = await form.mutate(ops, snapshot.revision)
          if (accepted) setNotice({ kind: 'ok', text: successText })
          else setNotice({ kind: 'error', text: t('writeFailed') })
        } catch (error) {
          setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
        } finally {
          setBusy(false)
        }
      }, [form, snapshot.revision, t])

      const selectMode = useCallback(async (mode) => {
        if (mode === actualMode || modeBusy) return
        setModeBusy(true)
        setNotice({ kind: 'warn', text: t('modeToggling') })
        try {
          const accepted = await form.set('mode', mode)
          setNotice(accepted
            ? { kind: 'ok', text: t('modeApplied') }
            : { kind: 'error', text: t('writeFailed') })
        } catch (error) {
          setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
        } finally {
          setModeBusy(false)
        }
      }, [actualMode, form, modeBusy, t])

      const selectNativeModel = useCallback(() => {
        void mutate([{ op: 'set', path: ['modelKind'], value: 'native' }], t('modelApplied'))
      }, [mutate, t])

      const selectCustomModel = useCallback((provider, model) => {
        void mutate([
          { op: 'set', path: ['modelKind'], value: 'custom' },
          { op: 'set', path: ['provider'], value: provider },
          { op: 'set', path: ['model'], value: model },
        ], t('modelApplied'))
      }, [mutate, t])

      const saveTargets = useCallback(() => {
        const nextWords = Number(words)
        const nextCjk = Number(cjk)
        if (!Number.isInteger(nextWords) || nextWords < 1 || !Number.isInteger(nextCjk) || nextCjk < 1) {
          setNotice({ kind: 'error', text: t('writeFailed') })
          return
        }
        void mutate([
          { op: 'set', path: ['targetWords'], value: nextWords },
          { op: 'set', path: ['targetCjkCharacters'], value: nextCjk },
        ], t('promptApplied'))
      }, [cjk, mutate, t, words])

      const restoreDefaults = useCallback(() => {
        setWords(String(DEFAULT_TARGET_WORDS))
        setCjk(String(DEFAULT_TARGET_CJK_CHARACTERS))
        void mutate([
          { op: 'set', path: ['targetWords'], value: DEFAULT_TARGET_WORDS },
          { op: 'set', path: ['targetCjkCharacters'], value: DEFAULT_TARGET_CJK_CHARACTERS },
        ], t('restored'))
      }, [mutate, t])

      const modeForPreview = actualMode ?? (value.mode === 'all-prompts' ? 'all-prompts' : 'first-prompt')
      const preview = useMemo(() => basePrompt(Number(words) || DEFAULT_TARGET_WORDS, Number(cjk) || DEFAULT_TARGET_CJK_CHARACTERS), [words, cjk])

      if (snapshot.status === 'loading') {
        return h('div', { className: 'stt-page' }, h('style', null, css), h('p', { className: 'stt-loading' }, t('loading')))
      }
      if (snapshot.status === 'unavailable') {
        return h('div', { className: 'stt-page' }, h('style', null, css),
          h('p', { className: 'stt-notice stt-notice-warn' }, t('unavailable')))
      }

      const groups = catalog.status === 'ready' ? catalog.groups : []
      const customRoute = value.modelKind === 'custom'
      const currentRoute = customRoute ? `${value.provider}\u0000${value.model}` : ''
      const catalogHasCurrent = groups.some(group =>
        group.models?.some(model => `${group.id}\u0000${model.id}` === currentRoute))
      const currentLabel = customRoute
        ? `${value.provider}/${value.model}`
        : t('modelNative')

      return h('div', { className: 'stt-page' },
        h('style', null, css),
        h('h2', { className: 'stt-heading' }, t('title')),
        h('p', { className: 'stt-intro' }, t('intro')),
        h(Notice, { notice }),

        h(Card, { title: t('modeTitle'), hint: t('modeHint') },
          h('div', { className: 'stt-modes' },
            h('button', {
              type: 'button',
              className: 'stt-mode',
              'aria-pressed': actualMode === 'first-prompt',
              disabled: modeBusy || busy,
              onClick: () => { void selectMode('first-prompt') },
            },
            h('span', { className: 'stt-mode-title' }, t('modeFirstPrompt')),
            h('span', { className: 'stt-mode-hint' }, t('modeFirstPromptHint'))),
            h('button', {
              type: 'button',
              className: 'stt-mode',
              'aria-pressed': actualMode === 'all-prompts',
              disabled: modeBusy || busy,
              onClick: () => { void selectMode('all-prompts') },
            },
            h('span', { className: 'stt-mode-title' }, t('modeAllPrompts')),
            h('span', { className: 'stt-mode-hint' }, t('modeAllPromptsHint'))),
          ),
          h('p', { className: 'stt-hint' },
            t('modeActual'), '：',
            actualMode === undefined
              ? h('span', { className: 'stt-unknown' }, t('modeUnknown'))
              : h('strong', null, actualMode === 'all-prompts' ? t('modeAllPrompts') : t('modeFirstPrompt'))),
        ),

        h(Card, { title: t('modelTitle'), hint: t('modelHint') },
          h('div', { className: 'stt-choices' },
            h('label', { className: 'stt-choice', 'data-active': !customRoute },
              h('input', {
                type: 'radio',
                name: 'stt-model-kind',
                checked: !customRoute,
                disabled: busy,
                onChange: selectNativeModel,
              }),
              h('span', { className: 'stt-choice-body' },
                h('span', { className: 'stt-choice-title' }, t('modelNative')),
                h('span', { className: 'stt-choice-hint' }, t('modelNativeHint')),
              ),
            ),
            h('label', { className: 'stt-choice', 'data-active': customRoute },
              h('input', {
                type: 'radio',
                name: 'stt-model-kind',
                checked: customRoute,
                disabled: busy || groups.length === 0,
                onChange: () => {
                  if (groups.length > 0) {
                    const firstGroup = groups[0]
                    const firstModel = firstGroup.models?.[0]
                    if (firstModel !== undefined) selectCustomModel(firstGroup.id, firstModel.id)
                  }
                },
              }),
              h('span', { className: 'stt-choice-body' },
                h('span', { className: 'stt-choice-title' }, t('modelCustom')),
                h('span', { className: 'stt-choice-hint' }, t('modelCustomHint')),
              ),
            ),
          ),

          customRoute
            ? h('div', null,
              catalog.status === 'loading'
                ? h('p', { className: 'stt-hint' }, t('modelCatalogLoading'))
                : null,
              catalog.status === 'error'
                ? h('div', { className: 'stt-actions' },
                  h('span', { className: 'stt-notice stt-notice-error' }, t('modelCatalogError')),
                  h('button', {
                    type: 'button',
                    className: 'stt-button',
                    onClick: () => { setCatalogNonce(nonce => nonce + 1) },
                  }, t('modelCatalogRetry')))
                : null,
              groups.length === 0 && catalog.status === 'ready'
                ? h('p', { className: 'stt-hint' }, t('modelEmpty'))
                : null,
              groups.length > 0
                ? h('div', { className: 'stt-models' },
                  groups.map(group => h('div', { key: group.id, className: 'stt-group' },
                    h('div', { className: 'stt-group-name' }, group.name),
                    (group.models ?? []).map(model => {
                      const key = `${group.id}\u0000${model.id}`
                      return h('label', { key, className: 'stt-model' },
                        h('input', {
                          type: 'radio',
                          name: 'stt-model-route',
                          checked: currentRoute === key,
                          disabled: busy,
                          onChange: () => { selectCustomModel(group.id, model.id) },
                        }),
                        h('span', { className: 'stt-model-name' }, model.name),
                        h('span', { className: 'stt-model-route' }, `${group.name} · ${group.id}/${model.id}`),
                      )
                    }),
                  )),
                  customRoute && !catalogHasCurrent
                    ? h('div', { className: 'stt-group' },
                      h('div', { className: 'stt-group-name' }, t('modelUnavailable')),
                      h('label', { className: 'stt-model' },
                        h('input', { type: 'radio', name: 'stt-model-route', checked: true, readOnly: true }),
                        h('span', { className: 'stt-model-name' }, currentLabel),
                      ))
                    : null,
                )
                : null,
            )
            : null,
        ),

        h(Card, { title: t('promptTitle'), hint: t('promptHint') },
          h('div', { className: 'stt-targets' },
            h('label', { className: 'stt-field' }, t('promptWords'),
              h('input', {
                type: 'number',
                min: 1,
                step: 1,
                value: words,
                disabled: busy,
                onChange: event => { setWords(event.target.value) },
              })),
            h('label', { className: 'stt-field' }, t('promptCjk'),
              h('input', {
                type: 'number',
                min: 1,
                step: 1,
                value: cjk,
                disabled: busy,
                onChange: event => { setCjk(event.target.value) },
              })),
            h('div', { className: 'stt-actions' },
              h('button', {
                type: 'button',
                className: 'stt-button stt-button-primary',
                disabled: busy,
                onClick: saveTargets,
              }, t('promptApply')),
              h('button', {
                type: 'button',
                className: 'stt-button',
                disabled: busy,
                onClick: restoreDefaults,
              }, t('promptRestore')),
            ),
          ),
          h('h4', { className: 'stt-card-title' }, t('promptPreview')),
          h('p', { className: 'stt-hint' }, t('promptPreviewHint')),
          h('pre', { className: 'stt-preview' }, preview),
          modeForPreview === 'all-prompts'
            ? h('div', null,
              h('h4', { className: 'stt-card-title' }, t('promptAnchor')),
              h('pre', { className: 'stt-anchor' }, anchorPrompt))
            : null,
        ),
      )
    }

    function SessionTitleRowConfig(props) {
      if (props.view === 'summary') {
        return h('span', null, props.t('rowSummary'))
      }
      return h(SessionTitlePage, { t: props.t, ctx: props.ctx })
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.session', 'remote.pluginManager', 'configForms'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { en, zh, 'zh-TW': zhTW }),
          'session-title-tools: dictionaries',
        )
        const t = ctx.locale.bind(NS)
        const injectFace = () => ({ t, ctx })

        ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => {
          const disposers = [
            ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
              name: 'settings.plugins.tab',
              id: 'session-title',
              order: 60,
              label: () => t('tabLabel'),
              locale: NS,
              inject: injectFace,
            }, SessionTitlePage)),
            ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
              name: 'plugins.row.config',
              key: '@local/dsh-session-title-tools#session-title-tools',
              locale: NS,
              inject: injectFace,
            }, SessionTitleRowConfig)),
          ]
          return () => {
            for (const dispose of disposers) dispose()
          }
        }), 'session-title-tools: settings page')
      },
    }
  },
})
