# Interactive Modeling (Edit Mode)

> This reference describes the interactive edit mode in the aia viewer.

## Target Picture

The edit mode allows interactive editing of connection paths (connection path points) without manually editing JSON.

## Activation

- Dev/edit mode is hidden by default.
- It becomes visible only when explicitly enabled in the model file under settings:

```json
{
  "settings": {
    "developerMode": true
  }
}
```

## Usage (Current State)

Prerequisite:
- Dev mode is enabled.
- A connection is selected.

### 1. Select a Connection

- Left-click on a visible connection to select it for editing.

### 2. Insert Points

- Shift + left-click inserts a new point on the selected line.
- The insertion position is shown as a hover preview.

### 3. Move Points

- Click and drag an existing point.
- Mouse movement is converted into 3D movement with perspective-correct behavior.
- Positions snap to a 0.5 grid.

### 4. Remove Points

- Select the active point.
- Press Delete or Backspace.

### 5. Clear Selection

- Press Escape.

## Undo / Redo

- Ctrl+Z: Undo
- Ctrl+Y or Ctrl+Shift+Z: Redo

Characteristics:
- Undo/redo works across the running edit session.
- Selection state (connection + active point) is restored from history.
- ConnectionGroup selection remains unchanged during undo/redo.
- Export does not clear undo/redo history.

Configurable history depth:

```json
{
  "settings": {
    "undoRedoDepth": 50
  }
}
```

## Export

- Export JSON writes a file containing the current in-memory model state (including modified points).
- Filename: existing model name with suffix `-devmode.json`.
- The exported file can then be manually merged into the source model if needed.

## Relevant Settings (Quick Overview)

```json
{
  "settings": {
    "developerMode": false,
    "undoRedoDepth": 50,
    "animateComponents": false,
    "showComponentPosition": false,
    "selectConnectionsAndComponents": false
  }
}
```

---

## References

- **Modeling Instructions for aia Models**  
  [Modeling Instructions](/doc/english/modelingInstructions.md)
