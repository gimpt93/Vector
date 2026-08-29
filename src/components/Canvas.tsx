import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";
import type { BoardSummary } from "../database/boardDatabase";
import BoardObjectsLayer from "./canvas/BoardObjectsLayer";
import TextEditorOverlay from "./canvas/TextEditorOverlay";
import Toolbar from "./canvas/Toolbar";
import type {
  DeleteAction,
  HistoryState,
  LineAction,
  MoveAction,
  TextAction,
  EditTextAction,
  TextEditor,
  Tool,
} from "./canvas/boardTypes";
import { resolveBoardActions } from "./canvas/history";
import { useBoardPersistence } from "./canvas/useBoardPersistence";
import { useDesktopBoardOverlay } from "./canvas/useDesktopBoardOverlay";
import { useWindowSize } from "./canvas/useWindowSize";

type CanvasProps = {
  board: BoardSummary;
  onExit: () => void;
};

const EMPTY_HISTORY: HistoryState = {
  actions: [],
  redoActions: [],
};

export default function Canvas({ board, onExit }: CanvasProps) {
  const [tool, setTool] = useState<Tool>("text");
  const [isControlPressed, setIsControlPressed] = useState(false);
  const [canvasOpacity, setCanvasOpacity] = useState(0.06);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [markerColor, setMarkerColor] = useState("#111111");
  const [markerWidth, setMarkerWidth] = useState(4);
  const [selectedActionId, setSelectedActionId] = useState<
    number | null
  >(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);

  const isDrawing = useRef(false);
  const nextActionId = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const persistence = useBoardPersistence(board.id, EMPTY_HISTORY);
  const { history, setHistory, isLoaded, saveStatus } = persistence;
  const overlay = useDesktopBoardOverlay(onExit);
  const windowSize = useWindowSize();

  // Pull the next action id from the persistence hook so that the
  // counter is consistent across boards and reloads.
  function allocateActionId(): number {
    const id = nextActionId.current;
    nextActionId.current += 1;
    return id;
  }

  // Keep the local ref in sync with whatever the persistence hook
  // learned about the highest saved id when the board finished loading.
  useEffect(() => {
    if (isLoaded) {
      const highestId = history.actions.reduce(
        (highest, action) => Math.max(highest, action.id),
        0,
      );
      nextActionId.current = Math.max(
        nextActionId.current,
        highestId + 1,
      );
    }
  }, [isLoaded, history.actions]);

  // Focus the text editor's input on the next tick after it opens.
  useEffect(() => {
    if (textEditor) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [textEditor]);

  // Keyboard: tool switching, undo/redo, delete, ctrl state.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Control" || event.key === "Meta") {
        setIsControlPressed(true);
      }

      const isEditing =
        inputRef.current === document.activeElement;
      if (isEditing) {
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoLastAction();
        } else {
          undoLastAction();
        }
        return;
      }

      if (hasModifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoLastAction();
        return;
      }

      if (!hasModifier) {
        const shortcuts: Partial<Record<string, Tool>> = {
          b: "draw",
          e: "erase",
          t: "text",
          h: "pan",
        };
        const nextTool = shortcuts[event.key.toLowerCase()];
        if (nextTool) {
          event.preventDefault();
          changeTool(nextTool);
          return;
        }
      }

      if (
        selectedActionId === null ||
        (event.key !== "Delete" && event.key !== "Backspace")
      ) {
        return;
      }

      event.preventDefault();

      const deleteAction: DeleteAction = {
        id: allocateActionId(),
        type: "delete",
        targetId: selectedActionId,
      };

      setHistory((current) => ({
        actions: [...current.actions, deleteAction],
        redoActions: [],
      }));
      setSelectedActionId(null);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Control" || event.key === "Meta") {
        setIsControlPressed(false);
      }
    }

    function handleBlur() {
      setIsControlPressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [
    tool,
    selectedActionId,
    history.actions.length,
    history.redoActions.length,
  ]);

  function getPointerPosition(
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return null;
    }
    return {
      worldX: (pointer.x - camera.x) / camera.scale,
      worldY: (pointer.y - camera.y) / camera.scale,
      screenX: pointer.x,
      screenY: pointer.y,
    };
  }

  function commitText() {
    if (!textEditor) {
      return;
    }
    const trimmedText = textEditor.value.trim();

    if (trimmedText.length > 0 && textEditor.targetId !== undefined) {
      const editTextAction: EditTextAction = {
        id: allocateActionId(),
        type: "editText",
        targetId: textEditor.targetId,
        value: trimmedText,
        fontSize: textEditor.fontSize,
        fontWeight: textEditor.fontWeight,
      };
      setHistory((current) => ({
        actions: [...current.actions, editTextAction],
        redoActions: [],
      }));
    } else if (trimmedText.length > 0) {
      const newText: TextAction = {
        id: allocateActionId(),
        type: "text",
        x: textEditor.worldX,
        y: textEditor.worldY,
        value: trimmedText,
        color: textEditor.color,
        fontSize: textEditor.fontSize,
        fontWeight: textEditor.fontWeight,
      };
      setHistory((current) => ({
        actions: [...current.actions, newText],
        redoActions: [],
      }));
    }

    setTextEditor(null);
  }

  function cancelText() {
    setTextEditor(null);
  }

  function handleMouseDown(event: KonvaEventObject<MouseEvent>) {
    if (textEditor) {
      commitText();
      return;
    }

    if (event.evt.ctrlKey || event.evt.metaKey) {
      if (event.target === event.target.getStage()) {
        setSelectedActionId(null);
      }
      return;
    }

    const point = getPointerPosition(event);
    if (!point || tool === "pan" || tool === "text") {
      return;
    }

    isDrawing.current = true;

    const newLine: LineAction = {
      id: allocateActionId(),
      type: "line",
      points: [point.worldX, point.worldY],
      color: markerColor,
      width: tool === "erase" ? 24 : markerWidth,
      lineTool: tool,
    };

    setHistory((current) => ({
      actions: [...current.actions, newLine],
      redoActions: [],
    }));
  }

  function openTextEditor(
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    if (event.evt.ctrlKey || event.evt.metaKey) {
      return;
    }

    const point = getPointerPosition(event);
    if (!point) {
      return;
    }

    stopDrawing();
    setTextEditor({
      worldX: point.worldX,
      worldY: point.worldY,
      screenX: point.screenX,
      screenY: point.screenY,
      value: "",
      color: markerColor,
      fontSize: 40,
      fontWeight: "bold",
    });
  }

  function editText(text: TextAction) {
    stopDrawing();
    setSelectedActionId(null);
    setTextEditor({
      targetId: text.id,
      worldX: text.x,
      worldY: text.y,
      screenX: text.x * camera.scale + camera.x,
      screenY: text.y * camera.scale + camera.y,
      value: text.value,
      color: text.color,
      fontSize: Math.max(text.fontSize, 36),
      fontWeight: text.fontWeight ?? "bold",
    });
  }

  function handleMouseMove(event: KonvaEventObject<MouseEvent>) {
    if (tool === "pan" || tool === "text" || !isDrawing.current) {
      return;
    }

    const point = getPointerPosition(event);
    if (!point) {
      return;
    }

    setHistory((current) => {
      const nextActions = [...current.actions];
      const lastIndex = nextActions.length - 1;
      const lastAction = nextActions[lastIndex];

      if (!lastAction || lastAction.type !== "line") {
        return current;
      }

      nextActions[lastIndex] = {
        ...lastAction,
        points: [
          ...lastAction.points,
          point.worldX,
          point.worldY,
        ],
      };

      return { ...current, actions: nextActions };
    });
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function moveLine(id: number, newPoints: number[]) {
    if (newPoints.length === 0) {
      return;
    }

    const resolvedTarget = resolveBoardActions(history.actions).objects.find(
      (object) => object.id === id,
    );
    if (!resolvedTarget || resolvedTarget.type !== "line") {
      return;
    }

    if (
      resolvedTarget.points.length === newPoints.length &&
      resolvedTarget.points.every(
        (value, index) => value === newPoints[index],
      )
    ) {
      return;
    }

    const moveAction: MoveAction = {
      id: allocateActionId(),
      type: "move",
      targetId: id,
      points: newPoints,
    };

    setHistory((current) => ({
      actions: [...current.actions, moveAction],
      redoActions: [],
    }));
  }

  function moveText(id: number, nextX: number, nextY: number) {
    const resolvedTarget = resolveBoardActions(history.actions).objects.find(
      (object) => object.id === id,
    );
    if (!resolvedTarget || resolvedTarget.type !== "text") {
      return;
    }

    if (nextX === resolvedTarget.x && nextY === resolvedTarget.y) {
      return;
    }

    const moveAction: MoveAction = {
      id: allocateActionId(),
      type: "move",
      targetId: id,
      x: nextX,
      y: nextY,
    };

    setHistory((current) => ({
      actions: [...current.actions, moveAction],
      redoActions: [],
    }));
  }

  const undoLastAction = useCallback(() => {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setHistory((current) => {
      if (current.actions.length === 0) {
        return current;
      }
      return {
        actions: current.actions.slice(0, -1),
        redoActions: [
          ...current.redoActions,
          current.actions[current.actions.length - 1]!,
        ],
      };
    });
  }, [setHistory]);

  const redoLastAction = useCallback(() => {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setHistory((current) => {
      if (current.redoActions.length === 0) {
        return current;
      }
      const restored =
        current.redoActions[current.redoActions.length - 1]!;
      return {
        actions: [...current.actions, restored],
        redoActions: current.redoActions.slice(0, -1),
      };
    });
  }, [setHistory]);

  function changeTool(nextTool: Tool) {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setTool(nextTool);
  }

  const resolvedBoard = useMemo(
    () => resolveBoardActions(history.actions),
    [history.actions],
  );

  return (
    <div
      className={`canvas-surface ${overlay.isDesktopBoardMode ? "canvas-surface--desktop-board" : ""} ${overlay.isParked ? "canvas-surface--parked" : ""} ${isFocusMode ? "canvas-surface--focus" : ""}`}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        cursor: isControlPressed
          ? "grab"
          : tool === "text"
            ? "text"
            : tool === "pan"
              ? "grab"
              : "crosshair",
        backgroundColor: isFocusMode
          ? "rgba(248, 250, 253, 0.97)"
          : `rgba(248, 250, 253, ${canvasOpacity})`,
      }}
    >
      <Stage
        width={windowSize.width}
        height={windowSize.height}
        x={camera.x}
        y={camera.y}
        scaleX={camera.scale}
        scaleY={camera.scale}
        draggable={tool === "pan"}
        onDragEnd={(event) => {
          if (event.target !== event.target.getStage()) {
            return;
          }
          setCamera((current) => ({
            ...current,
            x: event.target.x(),
            y: event.target.y(),
          }));
        }}
        onWheel={(event) => {
          event.evt.preventDefault();
          const stage = event.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (!stage || !pointer) {
            return;
          }

          const oldScale = camera.scale;
          const multiplier = event.evt.deltaY > 0 ? 0.9 : 1.1;
          const newScale = Math.min(8, Math.max(0.1, oldScale * multiplier));

          const worldPoint = {
            x: (pointer.x - camera.x) / oldScale,
            y: (pointer.y - camera.y) / oldScale,
          };

          setCamera({
            scale: newScale,
            x: pointer.x - worldPoint.x * newScale,
            y: pointer.y - worldPoint.y * newScale,
          });
        }}
        onMouseDown={handleMouseDown}
        onDblClick={openTextEditor}
        onDblTap={openTextEditor}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      >
        <BoardObjectsLayer
          objects={resolvedBoard.objects}
          deletedActionIds={resolvedBoard.deletedActionIds}
          isControlPressed={isControlPressed}
          selectedActionId={selectedActionId}
          onSelect={setSelectedActionId}
          onMoveLine={moveLine}
          onMoveText={moveText}
          onEditText={editText}
        />
      </Stage>

      {overlay.isDesktopBoardMode && (
        <div className="desktop-board-edge" aria-hidden="true" />
      )}

      {textEditor && (
        <TextEditorOverlay
          editor={textEditor}
          color={textEditor.color}
          inputRef={inputRef}
          onChange={(value) => {
            setTextEditor((current) =>
              current ? { ...current, value } : current,
            );
          }}
          onFontSizeChange={(fontSize) => {
            setTextEditor((current) =>
              current ? { ...current, fontSize } : current,
            );
          }}
          onFontWeightChange={(fontWeight) => {
            setTextEditor((current) =>
              current ? { ...current, fontWeight } : current,
            );
          }}
          onCommit={commitText}
          onCancel={cancelText}
        />
      )}

      {!overlay.isParked && (
        <Toolbar
          tool={tool}
          markerColor={markerColor}
          markerWidth={markerWidth}
          canUndo={history.actions.length > 0}
          canRedo={history.redoActions.length > 0}
          saveStatus={saveStatus}
          zoom={camera.scale}
          boardName={board.name}
          isDesktopBoardMode={overlay.isDesktopBoardMode}
          canvasOpacity={canvasOpacity}
          isFocusMode={isFocusMode}
          onToolChange={changeTool}
          onMarkerColorChange={setMarkerColor}
          onMarkerWidthChange={setMarkerWidth}
          onUndo={undoLastAction}
          onRedo={redoLastAction}
          onResetView={() => setCamera({ x: 0, y: 0, scale: 1 })}
          onExit={() => void overlay.exit()}
          onToggleDesktopBoard={() => void overlay.toggle()}
          onParkDesktop={() => void overlay.park()}
          onCanvasOpacityChange={setCanvasOpacity}
          onToggleFocusMode={() => setIsFocusMode((current) => !current)}
        />
      )}

      {overlay.isParked && (
        <div
          className="desktop-return-hint"
          role="status"
          aria-label="Vector is parked. Press Control Shift V to edit."
        >
          <span className="desktop-return-mark">V</span>
          <span>Vector parked</span>
          <span className="desktop-return-keys" aria-hidden="true">
            <kbd>Ctrl</kbd>
            <kbd>Shift</kbd>
            <kbd>V</kbd>
          </span>
          <span>to edit</span>
        </div>
      )}
    </div>
  );
}
