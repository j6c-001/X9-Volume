# X9 Volume

A tiny installable web app for Luxsin X9 volume control over your local network.

## Features

- Device status and title at the top
- Central volume knob (−100 dB to 0 dB line level)
- Mute button in the knob center
- IP configuration dialog
- Offline-capable PWA shell (LAN required for device control)

## Setup

Serve the static files from this directory:

```bash
python3 -m http.server 8080
```

Open the app on your phone (same LAN as the X9). Enter the device IP in settings.

The app is intended to be served over **HTTPS** (e.g. [GitHub Pages](https://j6c-001.github.io/X9-Volume/)). Device API calls use plain HTTP on your LAN, so browsers log **mixed content** warnings in the console. That is expected and does not affect the PWA shell itself.

## Install

Use your browser’s **Add to Home Screen** / **Install app** option. The app runs standalone with no build step and no dependencies.

## API

Uses the [Luxsin X9 Web API](https://am.luxsinaudio.com/ota/202607/x9/121c4/X9-API-README.md):

- Polls `/msgCount`, syncs via `/dev/info.cgi?action=syncData`
- Volume: `setting&volume=0..200` (mapped to −100..0 dB), snapped to the device `soundStep` (0.5 / 1 / 2 / 3 dB)
- Mute: `setting&isDacMetuVolume=1`

Input source labels match the official Luxsin X9 UI (`RCA`, `HDMI-EARC`, `USB Driver`, etc.).

## Files

```
index.html          Single page
css/app.css         Styles
js/                 Plain ES modules (no libraries)
manifest.webmanifest
sw.js               Service worker for offline shell
icons/              PWA icons
```
