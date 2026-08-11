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
        minWidth: "200px",
        padding: 0,
        border: "none",
        background: "transparent",
        color,
        caretColor: color,
        fontFamily:
          "Segoe Print, Comic Sans MS, cursive",
        fontSize: "24px",
        outline: "none",
      }}
    />
  );
}
