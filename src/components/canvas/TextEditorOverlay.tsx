import type { RefObject } from "react";
import type { TextEditor } from "./boardTypes";

type TextEditorOverlayProps = {
  editor: TextEditor;
  color: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onFontWeightChange: (fontWeight: "normal" | "bold") => void;
  onCommit: () => void;
  onCancel: () => void;
};

export default function TextEditorOverlay({
  editor,
  color,
  inputRef,
  onChange,
  onFontSizeChange,
  onFontWeightChange,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  const nonEmptyLines = editor.value
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const isBulletList =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => /^•\s/.test(line));
  const isNumberedList =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => /^\d+\.\s/.test(line));

  function toggleList(style: "bullet" | "number") {
    const lines = editor.value.split("\n");
    const bulletPattern = /^•\s/;
    const numberPattern = /^\d+\.\s/;
    const targetPattern = style === "bullet" ? bulletPattern : numberPattern;
    const contentLines = lines.filter((line) => line.trim().length > 0);
    const shouldRemove =
      contentLines.length > 0 &&
      contentLines.every((line) => targetPattern.test(line));

    if (contentLines.length === 0) {
      const prefix = style === "bullet" ? "• " : "1. ";
      onChange(prefix);
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(prefix.length, prefix.length);
      }, 0);
      return;
    }

    let itemNumber = 0;
    const formatted = lines.map((line) => {
      if (line.trim().length === 0) return line;

      const content = line.replace(bulletPattern, "").replace(numberPattern, "");
      if (shouldRemove) return content;

      itemNumber += 1;
      return style === "bullet"
        ? `• ${content}`
        : `${itemNumber}. ${content}`;
    });

    onChange(formatted.join("\n"));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function continueList() {
    const input = inputRef.current;
    if (!input || (!isBulletList && !isNumberedList)) {
      return false;
    }

    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const currentLineStart = editor.value.lastIndexOf("\n", selectionStart - 1) + 1;
    const currentLine = editor.value.slice(currentLineStart, selectionStart);
    const currentNumber = currentLine.match(/^(\d+)\.\s/)?.[1];
    const prefix = isBulletList
      ? "• "
      : `${Number(currentNumber ?? nonEmptyLines.length) + 1}. `;
    const insertion = `\n${prefix}`;
    const nextValue =
      editor.value.slice(0, selectionStart) +
      insertion +
      editor.value.slice(selectionEnd);
    const nextCaret = selectionStart + insertion.length;

    onChange(nextValue);
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    }, 0);
    return true;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${editor.screenX}px`,
        top: `${editor.screenY}px`,
        zIndex: 20,
      }}
    >
      <div className="note-editor-toolbar">
        {[32, 40, 56].map((size) => (
          <button
            key={size}
            type="button"
            className={editor.fontSize === size ? "active" : ""}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onFontSizeChange(size)}
            title={`${size}px text`}
          >
            {size}
          </button>
        ))}
        <button
          type="button"
          className={editor.fontWeight === "bold" ? "active note-bold" : "note-bold"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onFontWeightChange(editor.fontWeight === "bold" ? "normal" : "bold")}
          title="Bold"
        >
          B
        </button>
        <span className="note-editor-divider" />
        <button
          type="button"
          className={`note-list-button ${isBulletList ? "note-list-button--active" : ""}`}
          aria-pressed={isBulletList}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            toggleList("bullet");
          }}
          title="Toggle bullet list"
          aria-label="Toggle bullet list"
        >
          • —
        </button>
        <button
          type="button"
          className={`note-list-button ${isNumberedList ? "note-list-button--active" : ""}`}
          aria-pressed={isNumberedList}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            toggleList("number");
          }}
          title="Toggle numbered list"
          aria-label="Toggle numbered list"
        >
          1. —
        </button>
        <span>Enter to save · Shift+Enter for line</span>
      </div>

      <textarea
        className="note-editor-input"
        id="board-text-editor"
        name="board-text-editor"
        aria-label="Board text"
        ref={inputRef}
        value={editor.value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.shiftKey && continueList()) {
            event.preventDefault();
            return;
          }

          if (event.key === "Enter" && !event.shiftKey) {
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
          display: "block",
          width: "420px",
          minHeight: "58px",
          padding: "2px 4px",
          border: "none",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "3px",
          color,
          caretColor: color,
          cursor: "text",
          fontFamily: "Segoe Print, Comic Sans MS, cursive",
          fontSize: `${editor.fontSize}px`,
          fontWeight: editor.fontWeight === "bold" ? 700 : 400,
          lineHeight: 1.15,
          boxShadow: "none",
          outline: "none",
          resize: "both",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
