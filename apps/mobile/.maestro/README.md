# Maestro E2E Flows

End-to-end smoke + perf tests for the Songbook mobile app. Each flow
runs against the installed dev-client app on a real Android device or
emulator (also works on iOS Simulator with the iOS dev client).

## Install Maestro

One-time, on the dev machine:

```
curl -Ls "https://get.maestro.mobile.dev" | bash
```

That installs the `maestro` CLI to `~/.maestro/bin/`. Restart the shell
or `source ~/.zshrc` to pick up the PATH addition. Verify:

```
maestro --version
```

## Run a flow

The Android device or iOS simulator must be running, the Songbook app
must already be installed, and (for dev builds) Metro must be running
and reachable from the device. Then:

```
cd apps/mobile
maestro test .maestro/01-cold-start-demo.yaml
```

Run all flows sequentially:

```
maestro test .maestro
```

For the import-archive flow you'll need the IALC `with_tunes.songbook`
on the device (Files / Downloads); see comments inside that flow.

## What each flow tests

| Flow | Asserts |
|---|---|
| `01-cold-start-demo.yaml` | Demo book renders within 4 s on cold start |
| `02-import-large-archive.yaml` | 261 MB archive imports and first song renders |
| `03-search-by-number.yaml` | Numeric search jumps to the correct song |
| `04-audio-play.yaml` | Audio plays + survives a 5 s background trip |
| `05-swipe-stress.yaml` | 50 left-swipes don't crash + page counter advances |

## App identifiers

These match the Expo config for the Songbook app:
- Android package: `io.github.vbullinger.songbook`
- iOS bundle:      `io.github.vbullinger.songbook`

## Adding new flows

Maestro flows are YAML. The official reference: <https://maestro.mobile.dev/>.
Common commands used in our flows:

- `launchApp:` — launches by appId
- `tapOn: "<text or id>"` — tap by visible text or testID
- `inputText: "..."` — type into the focused field
- `assertVisible: "..."` — fail if text isn't visible
- `swipe: LEFT` / `swipe: RIGHT` — gesture
- `back:` — Android back button / iOS swipe-back
- `pressKey: Home` — go to home screen (for background tests)
