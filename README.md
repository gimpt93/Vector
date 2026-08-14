# Vector

Vector is a keyboard-first spatial whiteboard for turning thoughts into visible notes without losing the freedom to sketch around them.

The product is built around a simple distinction: text is the primary thinking tool; ink supports it. Double-click anywhere to type a prominent note, draw when words are not enough, and arrange both directly on an infinite canvas.

## Current capabilities

- Multiple named boards with local SQLite persistence
- Text-first canvas with large, high-contrast notes
- Double-click anywhere to create text; double-click a note to edit it
- Bold, bullet-list, numbered-list, and text-size controls
- Marker and eraser tools with visual ink previews
- Natural marker strokes with tapered entry points
- `Ctrl` + click + drag object movement
- Pan and cursor-centered zoom
- Undo and redo history
- Translucent dark toolbar and Glass/Focus surfaces
- Full-screen desktop overlay with Draw and click-through Desktop states
- Global `Ctrl` + `Shift` + `V` overlay shortcut and a subtle Draw-state edge glow

All board data remains local to the device.

## Controls

| Action | Control |
| --- | --- |
| Create a note | Double-click the canvas |
| Edit a note | Double-click the note |
| Save a note | `Enter` |
| Add a line inside a note | `Shift` + `Enter` |
| Text tool | `T` |
| Marker | `B` |
| Eraser | `E` |
| Pan | `H` |
| Move an object | Hold `Ctrl`, then click and drag |
| Delete an object | Select with `Ctrl` + click, then press `Delete` or `Backspace` |
| Undo | `Ctrl` + `Z` |
| Redo | `Ctrl` + `Y` or `Ctrl` + `Shift` + `Z` |
| Zoom | Mouse wheel |
| Enter/exit overlay | `Ctrl` + `Shift` + `V` |
| Return from Desktop pass-through to Draw | `Ctrl` + `Shift` + `V` |

## Install on Windows

Download the latest Windows installer from [GitHub Releases](https://github.com/gimpt93/Vector/releases/latest). The setup `.exe` is the simplest option; an `.msi` package is also provided.

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

Vector is moving toward a fast desktop thinking layer: summon it over existing work, type or draw without changing context, then return control to the application underneath. The next milestones are a tighter first-run experience, richer ink dynamics, and carefully scoped AI assistance that adds utility without adding toolbar bulk.

## Status

Vector v0.1.0 is a public Windows preview under active development. The core board workflow is usable; overlay behavior and cross-platform packaging should still be treated as preview features.
