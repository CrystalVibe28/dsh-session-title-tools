# Session title tools

Two agent tools plus a settings page for DeepSeek Harness session titles.

- `session_title_read` reads the current title of the calling session.
- `session_title_set` renames it. Its description carries DSH's native title
  rules (one line of plain natural-language text, language of the messages, and
  the current word / CJK character targets), so the model calling the tool
  generates the title itself; the tool never calls a model. The new title is
  pinned: automatic title generation stops for later messages.
- **Settings → Plugins → Session title** manages DSH's native title generation:
  - **Generation mode** switches the shipped `first-prompt` provider (base) and
    the `all-prompts` provider (experimental session-titles bundle) over the
    native plugin-manager remote. The page reports the switch's real outcome
    and reads the authoritative state back, so DSH's Plugins page shows the same
    thing. A manual switch on DSH's Plugins page is respected at startup and is
    never re-asserted.
  - **Title model** follows the session's running model, or pins any model
    advertised by the installed adapters. It is projected onto whichever native
    provider row is actually running, including after a mode switch.
  - **Native system prompt** previews the prompt DSH sends, derived from the
    native `targetWords` / `targetCjkCharacters` targets. Editing the targets
    writes the provider's own configuration; **Restore native defaults** puts
    back `5` words / `10` CJK characters.

The two tools need only `tools`, `sessions`, and `sessionTitle`; the management
half activates when `configEditor` is present and degrades to a Host-log error
when the native provider cannot be updated.

## Compatibility

The package declares `engines.dsh` (`>=0.2.2-rc.3 <0.3.0`) because it reads the
running DSH's provider rows and configuration editor. On a DSH release outside
that range, DSH skips this bundle with a compatibility diagnostic; native title
generation keeps working.

## Install

Install this directory as a local bundle from **Plugins → Add plugin**, then
restart if the Host asks for it (Host changes need a restart; page changes need
a browser refresh).

## Remove

1. Remove the bundle from **Plugins** (or `dsh plugin remove @local/dsh-session-title-tools`).
   This deselects it, unloads it, and removes the profile dependency.
2. Delete the leftover entry from the profile's `cordis.patch.yml`:

   ```yaml
   - id: session-title-tools
     name: '@local/dsh-session-title-tools'
     config: {}
   ```

   The profile patch is user-authored and removal never touches it, so an
   orphaned entry stays behind and DSH warns `patch: entry "session-title-tools"
   not found` at boot. It is only a warning; the entry is skipped.
3. Decide the generation mode. The experimental session-titles bundle is a
   separate shipped bundle, so removing this plugin leaves it selected if it was
   enabled. Turn it off on **Plugins** to return to DSH's first-prompt default.
4. Check the profile patch for native provider overrides this plugin projected
   (`session-title-llm` or `optional-session-title-all-prompts` with
   `targetWords`, `provider`, or `model`). They keep applying to the native
   provider after removal; delete them to return to the shipped defaults.
5. Restart DSH.

Removing the plugin does not touch DSH's installation directory, and titles that
were already pinned stay pinned (they are durable `session/title` events).

## Test

```sh
node --test test/*.test.mjs
```

## Limitations

- The settings form writes this plugin's own volatile configuration; the native
  provider projection happens afterwards in the Host. If that projection fails
  (no running provider row, or a value pinned by a home patch), the failure is
  reported in the Host log at error level and the page cannot show it.
- The prompt preview mirrors DSH 0.2.2-rc.3's shipped prompt text; a DSH update
  can make the preview approximate.
- The page requires the Web Settings and Plugins client modules declared in
  `dsh.client.inject`; a profile without them does not load this page.
- Older profiles may keep an inert `mode` key in this plugin's configuration
  block. The native bundle switch is authoritative now, so the key is ignored.
