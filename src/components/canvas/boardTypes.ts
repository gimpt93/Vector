export type Tool =
  | "draw"
  | "erase"
  | "text"
  | "pan";

export type LineAction = {
  id: number;
  type: "line";
  points: number[];
  color: string;
  width: number;
  lineTool: "draw" | "erase";
};

export type TextAction = {
  id: number;
  type: "text";
  x: number;
  y: number;
  value: string;
  color: string;
  fontSize: number;
  fontWeight?: "normal" | "bold";
};

export type DeleteAction = {
  id: number;
  type: "delete";
  targetId: number;
};

/**
 * A move action captures the *absolute* position of the object after the
 * move. This keeps the action log self-contained: every action is
 * independently re-runnable, so undo/redo and save/load never depend on the
 * history it was extracted from.
 */
export type MoveAction = {
  id: number;
  type: "move";
  targetId: number;
  // Absolute position after the move. For lines, `points` is replaced in full.
  x?: number;
  y?: number;
  points?: number[];
};

export type EditTextAction = {
  id: number;
  type: "editText";
  targetId: number;
  value: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
};

export type BoardAction =
  | LineAction
  | TextAction
  | DeleteAction
  | MoveAction
  | EditTextAction;

export type BoardObject =
  | LineAction
  | TextAction;

export type HistoryState = {
  actions: BoardAction[];
  redoActions: BoardAction[];
};

export type TextEditor = {
  targetId?: number;
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  value: string;
  color: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
};
