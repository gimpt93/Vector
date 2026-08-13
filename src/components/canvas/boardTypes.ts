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
};

export type DeleteAction = {
  id: number;
  type: "delete";
  targetId: number;
};

export type MoveAction = {
  id: number;
  type: "move";
  targetId: number;
  deltaX: number;
  deltaY: number;
};

export type EditTextAction = {
  id: number;
  type: "editText";
  targetId: number;
  value: string;
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
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  value: string;
  color: string;
};
