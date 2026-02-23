# Disclaimer

This project is somewhat vibecoded.

# Simple Round

An analog watchface for **Pebble Round 2 (Gabbro, 260x260)** built with Alloy (Moddable JS).

It shows:

- Analog hands and dial markers
- 12/3/6/9 numerals
- Center digital time + date
- Weather icon + temperature
- Clay settings for dark mode, Fahrenheit/Celsius, and 12h/24h time

## Platform

- Target: `gabbro` (Pebble Round 2)
- Display: `260x260` round color e-paper

## Build and Run

```bash
pebble build && pebble install --emulator gabbro --vnc
```

Without VSCode/VNC:

```bash
pebble build && pebble install --emulator gabbro
```

## Settings

Open settings with:

```bash
pebble emu-app-config
```

Available toggles:

- Dark Mode
- Use Fahrenheit
- Use 24-Hour Time
- Show Digital Time
- Show Date
- Show Weather

Settings and recent weather are persisted in `localStorage`.

## Memory Note

This project uses a custom `ModdableCreationRecord` in `src/c/mdbl.c` to increase XS runtime memory (`slot` and `chunk`) for stability when using weather fetch + settings updates.

## Project Layout

- `src/embeddedjs/main.js` - watchface rendering, weather, settings handling
- `src/pkjs/index.js` - Clay init + Pebble proxy wiring
- `src/pkjs/config.js` - Clay settings schema
- `src/c/mdbl.c` - C entrypoint and Moddable machine creation

## Useful Commands

```bash
pebble logs
pebble screenshot screenshot.png --no-open --scale 1
```
