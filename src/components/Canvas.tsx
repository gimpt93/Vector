import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Stage } from "react-konva";
import {
  loadBoard,
  saveBoard,
  type BoardSummary,
} from "../database/boardDatabase";
import BoardObjectsLayer from "./canvas/BoardObjectsLayer";
import TextEditorOverlay from "./canvas/TextEditorOverlay";
import Toolbar from "./canvas/Toolbar";
import type {
  BoardAction,
  DeleteAction,
  HistoryState,
  LineAction,
  MoveAction,
  TextAction,
  EditTextAction,
  TextEditor,
  Tool,
} from "./canvas/boardTypes";
import {
  redoHistory,
  resolveBoardActions,
  undoHistory,
} from "./canvas/history";

type CanvasProps = {
  board: BoardSummary;
  onExit: () => void;
};

export default function Canvas({ board, onExit }: CanvasProps) {
  const [tool, setTool] = useState<Tool>("text");

  const [isControlPressed, setIsControlPressed] =
    useState(false);

  const [isOverlayMode, setIsOverlayMode] =
    useState(false);

  const [isPassThrough, setIsPassThrough] =
    useState(false);

  const [canvasOpacity, setCanvasOpacity] =
    useState(0.06);

  const [isFocusMode, setIsFocusMode] =
    useState(false);

  const [markerColor, setMarkerColor] =
    useState("#111111");

  const [markerWidth, setMarkerWidth] =
    useState(4);

  const [selectedActionId, setSelectedActionId] =
    useState<number | null>(null);

  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [history, setHistory] =
    useState<HistoryState>({
      actions: [],
      redoActions: [],
    });

  const [isBoardLoaded, setIsBoardLoaded] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<"loading" | "saving" | "saved" | "error">("loading");

  const [textEditor, setTextEditor] =
    useState<TextEditor | null>(null);

  const isDrawing = useRef(false);
  const overlayModeRef = useRef(false);
  const passThroughRef = useRef(false);
  const nextActionId = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    overlayModeRef.current = isOverlayMode;
  }, [isOverlayMode]);

  useEffect(() => {
    passThroughRef.current = isPassThrough;
  }, [isPassThrough]);

  useEffect(() => {
    async function handleOverlayShortcut() {
      const currentWindow = getCurrentWindow();

      if (passThroughRef.current) {
        await currentWindow.setIgnoreCursorEvents(false);
        await currentWindow.setFocus();
        passThroughRef.current = false;
        setIsPassThrough(false);
        return;
      }

      const nextOverlayMode = !overlayModeRef.current;
      await currentWindow.setAlwaysOnTop(nextOverlayMode);
      await currentWindow.setFullscreen(nextOverlayMode);
      if (nextOverlayMode) await currentWindow.setFocus();
      overlayModeRef.current = nextOverlayMode;
      setIsOverlayMode(nextOverlayMode);
    }

    function onOverlayShortcut() {
      void handleOverlayShortcut().catch((error) => {
        console.error("Could not toggle Vector overlay:", error);
      });
    }

    window.addEventListener("vector:overlay-shortcut", onOverlayShortcut);

    return () => {
      window.removeEventListener("vector:overlay-shortcut", onOverlayShortcut);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  useEffect(() => {
    async function restoreBoard() {
      try {
        const savedBoard = await loadBoard(board.id);

        if (savedBoard) {
          const savedActions =
            JSON.parse(savedBoard) as BoardAction[];

          setHistory({
            actions: savedActions,
            redoActions: [],
          });

          const highestId = savedActions.reduce(
            (highest, action) =>
              Math.max(highest, action.id),
            0,
          );

          nextActionId.current = highestId + 1;
        }
      } catch (error) {
        console.error(
          "Could not load Vector board:",
          error,
        );
      } finally {
        setIsBoardLoaded(true);
      }
    }

    void restoreBoard();
  }, [board.id]);

  useEffect(() => {
    if (!isBoardLoaded) {
      return;
    }

    setSaveStatus("saving");

    const saveTimer = window.setTimeout(async () => {
      try {
        await saveBoard(
          board.id,
          JSON.stringify(history.actions),
        );
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        console.error(
          "Could not save Vector board:",
          error,
        );
      }
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [history.actions, isBoardLoaded]);

  useEffect(() => {
    if (textEditor) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [textEditor]);

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
        (event.key !== "Delete" &&
          event.key !== "Backspace")
      ) {
        return;
      }

      event.preventDefault();

      const deleteAction: DeleteAction = {
        id: nextActionId.current,
        type: "delete",
        targetId: selectedActionId,
      };

      nextActionId.current += 1;

      setHistory((current) => ({
        actions: [
          ...current.actions,
          deleteAction,
        ],
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

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [tool, selectedActionId, history.actions.length, history.redoActions.length]);

  function getPointerPosition(
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const stage = event.target.getStage();
    const pointer =
      stage?.getPointerPosition();

    if (!pointer) {
      return null;
    }

    return {
      worldX:
        (pointer.x - camera.x) /
        camera.scale,

      worldY:
        (pointer.y - camera.y) /
        camera.scale,

      screenX: pointer.x,
      screenY: pointer.y,
    };
  }

  function commitText() {
    if (!textEditor) {
      return;
    }

    const trimmedText =
      textEditor.value.trim();

    if (trimmedText.length > 0 && textEditor.targetId !== undefined) {
      const editTextAction: EditTextAction = {
        id: nextActionId.current,
        type: "editText",
        targetId: textEditor.targetId,
        value: trimmedText,
        fontSize: textEditor.fontSize,
        fontWeight: textEditor.fontWeight,
      };

      nextActionId.current += 1;
      setHistory((current) => ({
        actions: [...current.actions, editTextAction],
        redoActions: [],
      }));
    } else if (trimmedText.length > 0) {
      const newText: TextAction = {
        id: nextActionId.current,
        type: "text",
        x: textEditor.worldX,
        y: textEditor.worldY,
        value: trimmedText,
        color: textEditor.color,
        fontSize: textEditor.fontSize,
        fontWeight: textEditor.fontWeight,
      };

      nextActionId.current += 1;

      setHistory((current) => ({
        actions: [
          ...current.actions,
          newText,
        ],
        redoActions: [],
      }));
    }

    setTextEditor(null);
  }

  function cancelText() {
    setTextEditor(null);
  }

  function handleMouseDown(
    event: KonvaEventObject<MouseEvent>,
  ) {
    if (textEditor) {
      commitText();
      return;
    }

    if (event.evt.ctrlKey || event.evt.metaKey) {
      if (
        event.target ===
        event.target.getStage()
      ) {
        setSelectedActionId(null);
      }

      return;
    }

    const point =
      getPointerPosition(event);

    if (!point || tool === "pan") {
      return;
    }

    if (tool === "text") {
      return;
    }

    isDrawing.current = true;

    const newLine: LineAction = {
      id: nextActionId.current,
      type: "line",

      points: [
        point.worldX,
        point.worldY,
      ],

      color: markerColor,

      width:
        tool === "erase"
          ? 24
          : markerWidth,

      lineTool: tool,
    };

    nextActionId.current += 1;

    setHistory((current) => ({
      actions: [
        ...current.actions,
        newLine,
      ],
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

  function handleMouseMove(
    event: KonvaEventObject<MouseEvent>,
  ) {
    if (
      tool === "pan" ||
      tool === "text" ||
      !isDrawing.current
    ) {
      return;
    }

    const point =
      getPointerPosition(event);

    if (!point) {
      return;
    }

    setHistory((current) => {
      const nextActions = [
        ...current.actions,
      ];

      const lastIndex =
        nextActions.length - 1;

      const lastAction =
        nextActions[lastIndex];

      if (
        !lastAction ||
        lastAction.type !== "line"
      ) {
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

      return {
        ...current,
        actions: nextActions,
      };
    });
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function moveObject(
    id: number,
    offsetX: number,
    offsetY: number,
  ) {
    if (offsetX === 0 && offsetY === 0) {
      return;
    }

    const moveAction: MoveAction = {
      id: nextActionId.current,
      type: "move",
      targetId: id,
      deltaX: offsetX,
      deltaY: offsetY,
    };

    nextActionId.current += 1;

    setHistory((current) => ({
      actions: [
        ...current.actions,
        moveAction,
      ],
      redoActions: [],
    }));
  }

  function undoLastAction() {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setHistory(undoHistory);
  }

  function redoLastAction() {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setHistory(redoHistory);
  }

  function changeTool(nextTool: Tool) {
    stopDrawing();
    cancelText();
    setSelectedActionId(null);
    setTool(nextTool);
  }

  async function toggleOverlayMode() {
    const nextOverlayMode = !isOverlayMode;
    const currentWindow = getCurrentWindow();

    try {
      if (!nextOverlayMode && passThroughRef.current) {
        await currentWindow.setIgnoreCursorEvents(false);
        passThroughRef.current = false;
        setIsPassThrough(false);
      }

      await currentWindow.setAlwaysOnTop(nextOverlayMode);
      await currentWindow.setFullscreen(nextOverlayMode);
      overlayModeRef.current = nextOverlayMode;
      setIsOverlayMode(nextOverlayMode);
    } catch (error) {
      console.error("Could not change overlay mode:", error);
    }
  }

  async function enterDesktopMode() {
    if (!isOverlayMode) return;

    passThroughRef.current = true;
    setIsPassThrough(true);

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    try {
      await getCurrentWindow().setIgnoreCursorEvents(true);
    } catch (error) {
      passThroughRef.current = false;
      setIsPassThrough(false);
      console.error("Could not enter Desktop interaction mode:", error);
    }
  }

  async function exitBoard() {
    if (isOverlayMode) {
      const currentWindow = getCurrentWindow();
      await currentWindow.setIgnoreCursorEvents(false);
      passThroughRef.current = false;
      setIsPassThrough(false);
      await currentWindow.setFullscreen(false);
      await currentWindow.setAlwaysOnTop(false);
    }

    onExit();
  }

  const resolvedBoard = useMemo(
    () => resolveBoardActions(history.actions),
    [history.actions],
  );

  return (
    <div
      className={`canvas-surface ${isOverlayMode ? "canvas-surface--overlay" : ""} ${isFocusMode ? "canvas-surface--focus" : ""} ${isPassThrough ? "canvas-surface--desktop" : ""}`}
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
        backgroundColor: isPassThrough
          ? "transparent"
          : isFocusMode
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
          if (
            event.target !==
            event.target.getStage()
          ) {
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

          const stage =
            event.target.getStage();

          const pointer =
            stage?.getPointerPosition();

          if (!stage || !pointer) {
            return;
          }

          const oldScale =
            camera.scale;

          const multiplier =
            event.evt.deltaY > 0
              ? 0.9
              : 1.1;

          const newScale = Math.min(
            8,
            Math.max(
              0.1,
              oldScale * multiplier,
            ),
          );

          const worldPoint = {
            x:
              (pointer.x - camera.x) /
              oldScale,

            y:
              (pointer.y - camera.y) /
              oldScale,
          };

          setCamera({
            scale: newScale,

            x:
              pointer.x -
              worldPoint.x * newScale,

            y:
              pointer.y -
              worldPoint.y * newScale,
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
          deletedActionIds={
            resolvedBoard.deletedActionIds
          }
          isControlPressed={isControlPressed}
          selectedActionId={selectedActionId}
          onSelect={setSelectedActionId}
          onMoveLine={moveObject}
          onMoveText={moveObject}
          onEditText={editText}
        />
      </Stage>

      {isOverlayMode && !isPassThrough && (
        <div className="overlay-edge-glow" aria-hidden="true" />
      )}

      {textEditor && (
        <TextEditorOverlay
          editor={textEditor}
          color={textEditor.color}
          inputRef={inputRef}
          onChange={(value) => {
            setTextEditor((current) =>
              current
                ? { ...current, value }
                : current,
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

      {!isPassThrough && <Toolbar
        tool={tool}
        markerColor={markerColor}
        markerWidth={markerWidth}
        canUndo={history.actions.length > 0}
        canRedo={history.redoActions.length > 0}
        saveStatus={saveStatus}
        zoom={camera.scale}
        boardName={board.name}
        isOverlayMode={isOverlayMode}
        canvasOpacity={canvasOpacity}
        isFocusMode={isFocusMode}
        onToolChange={changeTool}
        onMarkerColorChange={setMarkerColor}
        onMarkerWidthChange={setMarkerWidth}
        onUndo={undoLastAction}
        onRedo={redoLastAction}
        onResetView={() => setCamera({ x: 0, y: 0, scale: 1 })}
        onExit={() => void exitBoard()}
        onToggleOverlay={() => void toggleOverlayMode()}
        onCanvasOpacityChange={setCanvasOpacity}
        onToggleFocusMode={() => setIsFocusMode((current) => !current)}
        onEnterDesktopMode={() => void enterDesktopMode()}
      />}
    </div>
  );
}
