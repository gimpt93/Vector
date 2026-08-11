import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Layer, Stage } from "react-konva";
import {
  loadBoard,
  saveBoard,
} from "../database/boardDatabase";
import Grid from "./Grid";
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
  TextEditor,
  Tool,
} from "./canvas/boardTypes";
import {
  redoHistory,
  resolveBoardActions,
  undoHistory,
} from "./canvas/history";

export default function Canvas() {
  const [tool, setTool] = useState<Tool>("draw");

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

  const [textEditor, setTextEditor] =
    useState<TextEditor | null>(null);

  const isDrawing = useRef(false);
  const nextActionId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

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
        const savedBoard = await loadBoard();

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
  }, []);

  useEffect(() => {
    if (!isBoardLoaded) {
      return;
    }

    async function persistBoard() {
      try {
        await saveBoard(
          JSON.stringify(history.actions),
        );
      } catch (error) {
        console.error(
          "Could not save Vector board:",
          error,
        );
      }
    }

    void persistBoard();
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
      if (
        inputRef.current ===
          document.activeElement ||
        tool !== "select" ||
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

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [tool, selectedActionId]);

  function getPointerPosition(
    event: KonvaEventObject<MouseEvent>,
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

    if (trimmedText.length > 0) {
      const newText: TextAction = {
        id: nextActionId.current,
        type: "text",
        x: textEditor.worldX,
        y: textEditor.worldY,
        value: trimmedText,
        color: textEditor.color,
        fontSize: 24,
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
    if (tool === "select") {
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
      setTextEditor({
        worldX: point.worldX,
        worldY: point.worldY,
        screenX: point.screenX,
        screenY: point.screenY,
        value: "",
        color: markerColor,
      });

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

  function handleMouseMove(
    event: KonvaEventObject<MouseEvent>,
  ) {
    if (
      tool === "select" ||
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

  const resolvedBoard = useMemo(
    () => resolveBoardActions(history.actions),
    [history.actions],
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
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
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      >
        <Layer>
          <Grid
            width={windowSize.width}
            height={windowSize.height}
          />
        </Layer>

        <BoardObjectsLayer
          objects={resolvedBoard.objects}
          deletedActionIds={
            resolvedBoard.deletedActionIds
          }
          tool={tool}
          selectedActionId={selectedActionId}
          onSelect={setSelectedActionId}
          onMoveLine={moveObject}
          onMoveText={moveObject}
        />
      </Stage>

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
          onCommit={commitText}
          onCancel={cancelText}
        />
      )}

      <Toolbar
        tool={tool}
        markerColor={markerColor}
        markerWidth={markerWidth}
        canUndo={history.actions.length > 0}
        canRedo={history.redoActions.length > 0}
        onToolChange={changeTool}
        onMarkerColorChange={setMarkerColor}
        onMarkerWidthChange={setMarkerWidth}
        onUndo={undoLastAction}
        onRedo={redoLastAction}
      />
    </div>
  );
}
