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
- Pebble Tool: `5.0.39` or newer
- Supported SDK: `4.9.148`

SDK 4.9.169 and 4.17 were also tested. SDK 4.9.169 introduces a fatal
`Headers` error in the Pebble fetch stack, while SDK 4.17's larger Alloy 8.2
runtime exhausts the available memory with this watchface's complete feature
set. Use SDK 4.9.148 when producing the 1.4 release build.

## Build and Run

```bash
pebble sdk activate 4.9.148
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
- Show Battery
- Only Show Low Battery
- Show Bluetooth
- Show Disconnected BT

Settings and recent weather are persisted in `localStorage`.

## Memory Note

Round 2 has 128 KB of application RAM shared by the native Pebble runtime and
the Alloy XS virtual machine. Simple Round needs explicit limits on both sides
of that boundary:

- `src/c/mdbl.c` reserves a 6 KB stack, 32 KB slot heap, and 32 KB chunk heap.
  Removing this override was tested on SDK 4.9.169 and caused a startup abort
  when the dynamically managed chunk heap could not allocate another 1,044
  bytes.
- The first `pebble/message` instance uses 1 KB input and output buffers. The
  platform default is the maximum 8.2 KB in each direction, consuming about
  16.4 KB of native heap before Alloy finishes starting.

These settings were verified together on a clean Gabbro emulator. Do not remove
the custom `ModdableCreationRecord` merely because newer SDK examples use
`moddable_createMachine(NULL)`; this watchface's larger snapshot still needs the
fixed allocation.

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
