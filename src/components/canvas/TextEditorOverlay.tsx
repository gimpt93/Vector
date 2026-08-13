import type { RefObject } from "react";
import type { TextEditor } from "./boardTypes";

type TextEditorOverlayProps = {
  editor: TextEditor;
  color: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export default function TextEditorOverlay({
  editor,
  color,
  inputRef,
  onChange,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  return (
    <input
      id="board-text-editor"
      name="board-text-editor"
      aria-label="Board text"
      ref={inputRef}
      value={editor.value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={onCommit}
      style={{
        position: "absolute",
        left: `${editor.screenX}px`,
        top: `${editor.screenY}px`,
        zIndex: 20,
        minWidth: "320px",
        padding: "3px 6px",
        border: "none",
        background: "rgba(255, 255, 255, 0.72)",
        borderRadius: "7px",
        color,
        caretColor: color,
        fontFamily:
          "Inter, Segoe UI, Arial, sans-serif",
        fontSize: "40px",
        fontWeight: 700,
        lineHeight: 1.15,
        boxShadow: "0 5px 18px rgba(20, 29, 43, 0.14)",
        outline: "none",
      }}
    />
  );
}
