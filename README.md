# X9 Volume

A tiny installable web app for Luxsin X9 volume control over your local network.

## Features

- Device status and title at the top
- Power on/off widget (top right)
- Central volume knob (−100 dB to 0 dB line level)
- Mute button in the knob center
- IP configuration dialog
- Offline-capable PWA shell (LAN required for device control)

## Setup

Serve the static files from this directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` on your phone (same LAN as the X9). Enter the device IP in settings.

## Install

Use your browser’s **Add to Home Screen** / **Install app** option. The app runs standalone with no build step and no dependencies.

## API

Uses the [Luxsin X9 Web API](https://am.luxsinaudio.com/ota/202607/x9/121c4/X9-API-README.md):

- Polls `/msgCount`, syncs via `/dev/info.cgi?action=syncData`
- Volume: `setting&volume=0..200` (mapped to −100..0 dB), snapped to the device `soundStep` (0.5 / 1 / 2 / 3 dB)
- Mute: `setting&isDacMetuVolume=1`
- Power off: `setting&power=1`

Power on must be done on the physical device; the app auto-reconnects when the device is reachable again.

## Files

```
index.html          Single page
css/app.css         Styles
js/                 Plain ES modules (no libraries)
manifest.webmanifest
sw.js               Service worker for offline shell
icons/              PWA icons
```
