# Vector

Vector is a keyboard-first spatial whiteboard for turning thoughts into visible notes without losing the freedom to sketch around them.

The product is built around a simple distinction: text is the primary thinking tool; ink supports it. Double-click anywhere to type a prominent note, draw when words are not enough, and arrange both directly on an infinite canvas.

## Current capabilities

- Multiple named boards with local SQLite persistence
- Text-first canvas with large, high-contrast notes
- Double-click anywhere to create text
- Marker and eraser tools with visual ink previews
- Natural marker strokes with tapered entry points
- `Ctrl` + click + drag object movement
- Pan and cursor-centered zoom
- Undo and redo history
- Translucent, focused canvas toolbar
- Experimental full-screen desktop overlay with adjustable veil opacity

All board data remains local to the device.

## Controls

| Action | Control |
| --- | --- |
| Create a note | Double-click the canvas |
| Text tool | `T` |
| Marker | `B` |
| Eraser | `E` |
| Pan | `H` |
| Move an object | Hold `Ctrl`, then click and drag |
| Delete an object | Select with `Ctrl` + click, then press `Delete` or `Backspace` |
| Undo | `Ctrl` + `Z` |
| Redo | `Ctrl` + `Y` or `Ctrl` + `Shift` + `Z` |
| Zoom | Mouse wheel |

## Run locally

### Prerequisites

- Node.js and npm
- Rust toolchain
- Tauri 2 system prerequisites for your operating system

```powershell
npm install
npm run tauri dev
```

Run the frontend test suite:

```powershell
npm test
```

Create a production frontend build:

```powershell
npm run build
```

## Architecture

Vector is a Tauri 2 desktop application using React, TypeScript, Konva, and SQLite.

- React manages the workspace and canvas interface.
- Konva renders notes and ink as movable canvas objects.
- An action-based history model powers undo, redo, movement, editing, and deletion.
- Tauri SQL persists each board locally in SQLite.
- Native Tauri window controls power the experimental overlay mode.

## Product direction

Vector is moving toward a fast desktop thinking layer: summon it over existing work, type or draw without changing context, then return control to the application underneath.

The next overlay milestone is a global shortcut and safe pointer pass-through mode. The next drawing milestone is velocity- and pressure-sensitive ink.

## Status

Vector is an early working prototype under active development. The core board workflow is usable; overlay behavior and cross-platform packaging are still experimental.
