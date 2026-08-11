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
  onToolChange: (tool: Tool) => void;
  onMarkerColorChange: (color: string) => void;
  onMarkerWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
};

const tools: { label: string; value: Tool }[] = [
  { label: "Select", value: "select" },
  { label: "Marker", value: "draw" },
  { label: "Eraser", value: "erase" },
  { label: "Text", value: "text" },
  { label: "Pan", value: "pan" },
];

export default function Toolbar({
  tool,
  markerColor,
  markerWidth,
  canUndo,
  canRedo,
  onToolChange,
  onMarkerColorChange,
  onMarkerWidthChange,
  onUndo,
  onRedo,
}: ToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px",
        background: "white",
        border: "1px solid #bbbbbb",
        borderRadius: "8px",
      }}
    >
      {tools.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onToolChange(value)}
          style={{
            fontWeight:
              tool === value ? "bold" : "normal",
          }}
        >
          {label}
        </button>
      ))}

      {markerColors.map((color) => (
        <button
          key={color.name}
          type="button"
          title={color.name}
          onClick={() =>
            onMarkerColorChange(color.value)
          }
          style={{
            width: "28px",
            height: "28px",
            padding: 0,
            backgroundColor: color.value,
            border:
              markerColor === color.value
                ? "3px solid #666666"
                : "1px solid #bbbbbb",
            borderRadius: "50%",
            cursor: "pointer",
          }}
        />
      ))}

      {markerSizes.map((size) => (
        <button
          key={size.name}
          type="button"
          onClick={() => {
            onMarkerWidthChange(size.value);
            onToolChange("draw");
          }}
          style={{
            fontWeight:
              markerWidth === size.value
                ? "bold"
                : "normal",
          }}
        >
          {size.name}
        </button>
      ))}

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>

      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
      >
        Redo
      </button>
    </div>
  );
}
