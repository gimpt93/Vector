import { useState } from "react";
import { markerColors, markerSizes } from "./boardConstants";
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
  isDesktopBoardMode: boolean;
  canvasOpacity: number;
  isFocusMode: boolean;
  onToolChange: (tool: Tool) => void;
  onMarkerColorChange: (color: string) => void;
  onMarkerWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetView: () => void;
  onExit: () => void;
  onToggleDesktopBoard: () => void;
  onParkDesktop: () => void;
  onCanvasOpacityChange: (opacity: number) => void;
  onToggleFocusMode: () => void;
};

type IconName =
  | "boards"
  | "text"
  | "marker"
  | "eraser"
  | "pan"
  | "undo"
  | "redo"
  | "reset"
  | "glass"
  | "desktop"
  | "cursor"
  | "droplet";

function RailIcon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg className="rail-icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "boards" && <><rect x="4" y="4" width="6" height="6" rx="1" {...common} /><rect x="14" y="4" width="6" height="6" rx="1" {...common} /><rect x="4" y="14" width="6" height="6" rx="1" {...common} /><rect x="14" y="14" width="6" height="6" rx="1" {...common} /></>}
      {name === "text" && <><path d="M5 6V4h14v2M12 4v16M8 20h8" {...common} /></>}
      {name === "marker" && <><path d="m4 20 1.2-4.2L16.8 4.2l3 3L8.2 18.8 4 20Z" {...common} /><path d="m14.8 6.2 3 3M5.2 15.8l3 3" {...common} /></>}
      {name === "eraser" && <><path d="m4.2 15.8 8.8-11 6.8 5.5-8.2 9.7H7.4l-3.2-2.6a1 1 0 0 1 0-1.6Z" {...common} /><path d="m9.6 9 6.7 5.5M11.6 20H21" {...common} /></>}
      {name === "pan" && <><path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5" {...common} /></>}
      {name === "undo" && <><path d="M8 7 4 11l4 4" {...common} /><path d="M5 11h8a6 6 0 0 1 6 6" {...common} /></>}
      {name === "redo" && <><path d="m16 7 4 4-4 4" {...common} /><path d="M19 11h-8a6 6 0 0 0-6 6" {...common} /></>}
      {name === "reset" && <><circle cx="12" cy="12" r="7" {...common} /><path d="M12 8v8M8 12h8" {...common} /></>}
      {name === "glass" && <><rect x="4" y="6" width="12" height="12" rx="3" {...common} /><rect x="8" y="3" width="12" height="12" rx="3" {...common} /></>}
      {name === "desktop" && <><rect x="3" y="4" width="18" height="13" rx="2" {...common} /><path d="M8 21h8M12 17v4" {...common} /><path d="m14.5 8 3.5 3.5-2.2.3-.9 2.2-1.5-.6.9-2.1-1.8-1.4 2.5-2.1Z" {...common} /></>}
      {name === "cursor" && <><path d="m5 3 13 9-6 1.2L8.5 19 5 3Z" {...common} /><path d="m12 13.2 4 6" {...common} /></>}
      {name === "droplet" && <><path d="M12 3S6.5 9.3 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.3 12 3 12 3Z" {...common} /><path d="M9.5 15.5a2.8 2.8 0 0 0 2.5 1.4" {...common} /></>}
    </svg>
  );
}

const tools: { label: string; value: Tool; shortcut: string; icon: IconName }[] = [
  { label: "Text", value: "text", shortcut: "T", icon: "text" },
  { label: "Marker", value: "draw", shortcut: "B", icon: "marker" },
  { label: "Eraser", value: "erase", shortcut: "E", icon: "eraser" },
  { label: "Pan", value: "pan", shortcut: "H", icon: "pan" },
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
  isDesktopBoardMode,
  canvasOpacity,
  isFocusMode,
  onToolChange,
  onMarkerColorChange,
  onMarkerWidthChange,
  onUndo,
  onRedo,
  onResetView,
  onExit,
  onToggleDesktopBoard,
  onParkDesktop,
  onCanvasOpacityChange,
  onToggleFocusMode,
}: ToolbarProps) {
  const [openPanel, setOpenPanel] = useState<"ink" | "opacity" | null>(null);
  const saveLabel = saveStatus === "loading" ? "Opening" : saveStatus === "saving" ? "Saving" : saveStatus === "error" ? "Save failed" : "Saved locally";

  function chooseTool(nextTool: Tool) {
    onToolChange(nextTool);
    setOpenPanel(nextTool === "draw" ? "ink" : null);
  }

  return (
    <aside className="toolbar-shell" aria-label="Vector tools">
      <div className="rail-brand" title={`${boardName} · ${saveLabel}`}>
        <span>V</span>
        <i className={`rail-save-dot rail-save-dot--${saveStatus}`} aria-hidden="true" />
      </div>

      <button type="button" className="rail-button" onClick={onExit} title="All boards" aria-label="All boards"><RailIcon name="boards" /></button>
      <div className="toolbar-divider" />

      <div className="tool-group" aria-label="Canvas tools">
        {tools.map(({ label, value, shortcut, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseTool(value)}
            className={`rail-button ${tool === value ? "rail-button--active" : ""}`}
            title={`${label} (${shortcut})`}
            aria-label={`${label}, shortcut ${shortcut}`}
            aria-pressed={tool === value}
          >
            <RailIcon name={icon} />
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />
      <button type="button" className="rail-button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><RailIcon name="undo" /></button>
      <button type="button" className="rail-button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo"><RailIcon name="redo" /></button>
      <button type="button" className="rail-button" onClick={onResetView} title={`Reset view (${Math.round(zoom * 100)}%)`} aria-label={`Reset view, zoom is ${Math.round(zoom * 100)} percent`}><RailIcon name="reset" /></button>

      <div className="toolbar-divider" />
      <button
        type="button"
        className={`rail-button ${isFocusMode ? "rail-button--active" : ""}`}
        onClick={onToggleFocusMode}
        title={isFocusMode ? "Switch to Glass" : "Switch to Focus"}
        aria-label={isFocusMode ? "Switch to Glass surface" : "Switch to Focus surface"}
      ><RailIcon name="glass" /></button>

      {isDesktopBoardMode && <button type="button" className={`rail-button ${openPanel === "opacity" ? "rail-button--active" : ""}`} onClick={() => setOpenPanel((current) => current === "opacity" ? null : "opacity")} title="Desktop glass opacity" aria-label="Adjust desktop glass opacity" aria-expanded={openPanel === "opacity"}><RailIcon name="droplet" /></button>}
      {isDesktopBoardMode && <button type="button" className="rail-button" onClick={onParkDesktop} title="Park Vector and click through (Ctrl+Shift+V)" aria-label="Park Vector and click through to the desktop"><RailIcon name="cursor" /></button>}
      <button
        type="button"
        className={`rail-button ${isDesktopBoardMode ? "rail-button--active" : ""}`}
        onClick={onToggleDesktopBoard}
        title={isDesktopBoardMode ? "Unpin desktop board (Ctrl+Shift+V)" : "Pin board to desktop (Ctrl+Shift+V)"}
        aria-label={isDesktopBoardMode ? "Unpin desktop board" : "Pin board to desktop"}
      ><RailIcon name="desktop" /></button>

      {openPanel === "ink" && (
        <div className="toolbar-popover ink-popover" role="dialog" aria-label="Marker settings">
          <div className="popover-title">Marker</div>
          <div className="swatch-group" aria-label="Marker colors">
            {markerColors.map((color) => (
              <button
                key={color.name}
                type="button"
                title={color.name}
                onClick={() => onMarkerColorChange(color.value)}
                className={`color-swatch ${markerColor === color.value ? "color-swatch--active" : ""}`}
                aria-label={`${color.name} marker`}
              ><span className={color.value === "#ffffff" ? "color-dot color-dot--white" : "color-dot"} style={{ backgroundColor: color.value }} /></button>
            ))}
          </div>
          <div className="size-group" aria-label="Marker size">
            {markerSizes.map((size) => (
              <button
                key={size.name}
                type="button"
                onClick={() => onMarkerWidthChange(size.value)}
                className={`size-button ${markerWidth === size.value ? "size-button--active" : ""}`}
                title={`${size.name} marker, ${size.value}px`}
                aria-label={`${size.name} marker, ${size.value} pixels`}
              ><span className="size-stroke" style={{ height: `${size.value}px`, backgroundColor: markerColor }} /></button>
            ))}
          </div>
        </div>
      )}

      {openPanel === "opacity" && (
        <div className="toolbar-popover opacity-popover" role="dialog" aria-label="Veil opacity">
          <div className="popover-title"><span>Veil</span><strong>{Math.round(canvasOpacity * 100)}%</strong></div>
          <input type="range" min="0" max="0.6" step="0.02" value={canvasOpacity} onChange={(event) => onCanvasOpacityChange(Number(event.target.value))} aria-label="Desktop veil opacity" />
        </div>
      )}

    </aside>
  );
}
