import {
  markerColors,
  markerSizes,
} from "./boardConstants";
import type { Tool } from "./boardTypes";

type ToolbarProps = {
  tool: Tool;
  markerColor: string;
  markerWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: "loading" | "saving" | "saved" | "error";
  zoom: number;
  boardName: string;
  isOverlayMode: boolean;
  canvasOpacity: number;
  isFocusMode: boolean;
  onToolChange: (tool: Tool) => void;
  onMarkerColorChange: (color: string) => void;
  onMarkerWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetView: () => void;
  onExit: () => void;
  onToggleOverlay: () => void;
  onCanvasOpacityChange: (opacity: number) => void;
  onToggleFocusMode: () => void;
};

const tools: { label: string; value: Tool; shortcut: string }[] = [
  { label: "Text", value: "text", shortcut: "T" },
  { label: "Marker", value: "draw", shortcut: "B" },
  { label: "Eraser", value: "erase", shortcut: "E" },
  { label: "Pan", value: "pan", shortcut: "H" },
];

export default function Toolbar({
  tool,
  markerColor,
  markerWidth,
  canUndo,
  canRedo,
  saveStatus,
  zoom,
  boardName,
  isOverlayMode,
  canvasOpacity,
  isFocusMode,
  onToolChange,
  onMarkerColorChange,
  onMarkerWidthChange,
  onUndo,
  onRedo,
  onResetView,
  onExit,
  onToggleOverlay,
  onCanvasOpacityChange,
  onToggleFocusMode,
}: ToolbarProps) {
  return (
    <div className="toolbar-shell">
      <div className="brand-block">
        <span className="brand-mark">V</span>
        <div>
          <strong>{boardName}</strong>
          <span className={`save-status save-status--${saveStatus}`}>
            {saveStatus === "loading" && "Opening board…"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved locally"}
            {saveStatus === "error" && "Save failed"}
          </span>
        </div>
      </div>

      <button type="button" className="home-button" onClick={onExit} title="All boards">All boards</button>

      <div className="toolbar-divider" />

      <div className="tool-group" aria-label="Canvas tools">
      {tools.map(({ label, value, shortcut }) => (
        <button
          key={value}
          type="button"
          onClick={() => onToolChange(value)}
          className={`tool-button ${tool === value ? "tool-button--active" : ""}`}
          title={`${label} (${shortcut})`}
        >
          <span>{label}</span><kbd>{shortcut}</kbd>
        </button>
      ))}
      </div>

      <div className="toolbar-divider" />

      <div className="swatch-group" aria-label="Marker colors">
      {markerColors.map((color) => (
        <button
          key={color.name}
          type="button"
          title={color.name}
          onClick={() =>
            onMarkerColorChange(color.value)
          }
          className={`color-swatch ${markerColor === color.value ? "color-swatch--active" : ""}`}
          aria-label={`${color.name} marker`}
        >
          <span
            className={`color-stroke ${color.value === "#ffffff" ? "color-stroke--white" : ""}`}
            style={{ backgroundColor: color.value }}
          />
        </button>
      ))}
      </div>

      <div className="size-group" aria-label="Marker size">
      {markerSizes.map((size) => (
        <button
          key={size.name}
          type="button"
          onClick={() => {
            onMarkerWidthChange(size.value);
            onToolChange("draw");
          }}
          className={`size-button ${markerWidth === size.value ? "size-button--active" : ""}`}
          title={`${size.name} marker — ${size.value}px`}
          aria-label={`${size.name} marker, ${size.value} pixels`}
        >
          <span
            className="size-stroke"
            style={{
              height: `${size.value}px`,
              backgroundColor: markerColor,
            }}
          />
        </button>
      ))}
      </div>

      <div className="toolbar-divider" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="history-button"
        title="Undo (Ctrl+Z)"
      >
        ↶ <span>Undo</span>
      </button>

      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="history-button"
        title="Redo (Ctrl+Y)"
      >
        ↷ <span>Redo</span>
      </button>

      <button type="button" className="zoom-button" onClick={onResetView} title="Reset view">
        {Math.round(zoom * 100)}%
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        className={`focus-toggle ${isFocusMode ? "focus-toggle--active" : ""}`}
        onClick={onToggleFocusMode}
        title="Switch between transparent Glass and opaque Focus surfaces"
      >
        {isFocusMode ? "Focus" : "Glass"}
      </button>

      {isOverlayMode && (
        <label className="opacity-control" title="Desktop veil opacity">
          <span>Veil</span>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.02"
            value={canvasOpacity}
            onChange={(event) => onCanvasOpacityChange(Number(event.target.value))}
          />
        </label>
      )}

      <button
        type="button"
        className={`overlay-button ${isOverlayMode ? "overlay-button--active" : ""}`}
        onClick={onToggleOverlay}
      >
        {isOverlayMode ? "Exit overlay" : "Overlay"}
      </button>

      {isOverlayMode && (
        <span className="shortcut-hint">Ctrl+Shift+V</span>
      )}
    </div>
  );
}
