# X9 Volume

A tiny installable web app for Luxsin X9 volume control over your local network.

## Features

- Device status and title at the top
- Configurable input sources (enable, custom label, built-in icon)
- Main-screen source selector that switches the X9 input
- Central volume knob (−100 dB to 0 dB line level) with stepped haptic feedback (Android Vibration API + click reinforcement; click-only where vibrate is unavailable)
- Mute button in the knob center
- Tabbed settings (Device / Appearance / Sources) with auto-save and close (X)
- Offline-capable PWA shell (LAN required for device control)

## Setup

Serve the static files from this directory:

```bash
python3 -m http.server 8080
```

Open the app on your phone (same LAN as the X9). Enter the device IP in settings.

The app is intended to be served over **HTTPS** (e.g. [GitHub Pages](https://j6c-001.github.io/X9-Volume/)). Device API calls use plain HTTP on your LAN, so browsers log **mixed content** warnings in the console. That is expected and does not affect the PWA shell itself.

App version is in `js/version.js` (`APP_VERSION`) and shown in Settings. **Bump it on every deploy** — the service worker cache name is derived from it, so installed clients fetch a new worker, activate it (`skipWaiting` + `clients.claim`), and reload once.

While the app is open it also rechecks for updates on foreground and about every 30 minutes.

## Install

Use your browser’s **Add to Home Screen** / **Install app** option. The app runs standalone with no build step and no dependencies. After a deploy, reopen the app (or wait for the periodic check) — it should refresh itself onto the new version.

## API

Uses the [Luxsin X9 Web API](https://am.luxsinaudio.com/ota/202607/x9/121c4/X9-API-README.md):

- Polls `/msgCount`, syncs via `/dev/info.cgi?action=syncData`
- Volume: `setting&volume=0..200` (mapped to −100..0 dB), snapped to the device `soundStep` (0.5 / 1 / 2 / 3 dB)
- Mute: `setting&isDacMetuVolume=1`
- Input: `setting&input=0..7`

Stock input labels match the official Luxsin X9 UI (`RCA`, `HDMI-EARC`, `USB Driver`, etc.). In Settings you can hide unused inputs and override labels/icons — device icons (TV, streamer, turntable, DAC, …) plus connection icons (USB, optical, HDMI, …), stored in `localStorage` as `x9-sources`. Enable **Icon only on main screen** (`x9-source-icon-only`) to hide chip labels and show icons alone.

## Files

```
index.html          Single page
css/app.css         Styles
js/                 Plain ES modules (no libraries)
manifest.webmanifest
sw.js               Service worker for offline shell
icons/              PWA icons
```
