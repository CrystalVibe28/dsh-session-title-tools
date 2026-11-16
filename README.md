# Session title tools

Two agent tools plus a settings page for DeepSeek Harness session titles.

- `session_title_read` reads the current title of the calling session.
- `session_title_set` renames it and pins the new title.
- **Settings → Plugins → Session title** manages DSH's native title generation:
  - **Generation mode** switches the shipped `first-prompt` provider (base) and
    the `all-prompts` provider (experimental session-titles bundle). The switch
    is a real profile change, so DSH's Plugins page shows the same state.
  - **Title model** follows the session's running model, or pins any model
    advertised by the installed adapters.
  - **Native system prompt** previews the prompt DSH sends, derived from the
    native `targetWords` / `targetCjkCharacters` targets. Editing the targets
    writes the provider's own configuration; **Restore native defaults** puts
    back `5` words / `10` CJK characters.

The two tools need only `tools`, `sessions`, and `sessionTitle`; the management
page activates when `configEditor` and `pluginManager` are present.

## Install

Install this directory as a local bundle from **Plugins → Add plugin**, then
restart if the Host asks for it.

## Limitations

- The page manages the shipped providers as they are; it does not replace their
  prompt strategy.
- Changing the mode reapplies the page's model and length settings to the newly
  active provider.
