import { describe, expect, it } from "vitest";
import type {
  BoardAction,
  HistoryState,
} from "./boardTypes";
import {
  redoHistory,
  resolveBoardActions,
  undoHistory,
} from "./history";

const line: BoardAction = {
  id: 1,
  type: "line",
  points: [10, 20, 30, 40],
  color: "#111111",
  width: 4,
  lineTool: "draw",
};

const boardText: BoardAction = {
  id: 2,
  type: "text",
  x: 50,
  y: 60,
  value: "Original",
  color: "#2563eb",
  fontSize: 24,
};

describe("resolveBoardActions", () => {
  it("preserves legacy objects and deletions", () => {
    const resolved = resolveBoardActions([
      line,
      boardText,
      { id: 3, type: "delete", targetId: 1 },
    ]);

    expect(resolved.objects).toEqual([
      line,
      boardText,
    ]);
    expect(resolved.deletedActionIds).toEqual(
      new Set([1]),
    );
  });

  it("accumulates movement for lines and text", () => {
    const resolved = resolveBoardActions([
      line,
      boardText,
      {
        id: 3,
        type: "move",
        targetId: 1,
        deltaX: 5,
        deltaY: -10,
      },
      {
        id: 4,
        type: "move",
        targetId: 1,
        deltaX: 2,
        deltaY: 3,
      },
      {
        id: 5,
        type: "move",
        targetId: 2,
        deltaX: -20,
        deltaY: 15,
      },
    ]);

    expect(resolved.objects[0]).toMatchObject({
      id: 1,
      points: [17, 13, 37, 33],
    });
    expect(resolved.objects[1]).toMatchObject({
      id: 2,
      x: 30,
      y: 75,
    });
  });

  it("applies the latest text edit", () => {
    const resolved = resolveBoardActions([
      boardText,
      {
        id: 3,
        type: "editText",
        targetId: 2,
        value: "First edit",
      },
      {
        id: 4,
        type: "editText",
        targetId: 2,
        value: "Final edit",
      },
    ]);

    expect(resolved.objects[0]).toMatchObject({
      id: 2,
      value: "Final edit",
    });
  });

  it("keeps moved and edited objects deleted", () => {
    const resolved = resolveBoardActions([
      boardText,
      {
        id: 3,
        type: "move",
        targetId: 2,
        deltaX: 20,
        deltaY: 30,
      },
      {
        id: 4,
        type: "editText",
        targetId: 2,
        value: "Edited",
      },
      {
        id: 5,
        type: "delete",
        targetId: 2,
      },
    ]);

    expect(resolved.objects[0]).toMatchObject({
      x: 70,
      y: 90,
      value: "Edited",
    });
    expect(resolved.deletedActionIds.has(2)).toBe(
      true,
    );
  });

  it("ignores updates for missing targets", () => {
    const resolved = resolveBoardActions([
      {
        id: 1,
        type: "move",
        targetId: 99,
        deltaX: 10,
        deltaY: 20,
      },
      {
        id: 2,
        type: "editText",
        targetId: 99,
        value: "Ignored",
      },
    ]);

    expect(resolved.objects).toEqual([]);
  });

  it("round-trips new actions through JSON", () => {
    const actions: BoardAction[] = [
      line,
      {
        id: 2,
        type: "move",
        targetId: 1,
        deltaX: 10,
        deltaY: 20,
      },
    ];

    const restored = JSON.parse(
      JSON.stringify(actions),
    ) as BoardAction[];

    expect(resolveBoardActions(restored).objects[0])
      .toMatchObject({
        points: [20, 40, 40, 60],
      });
  });
});

describe("history", () => {
  it("undoes and redoes a movement action", () => {
    const moveAction: BoardAction = {
      id: 3,
      type: "move",
      targetId: 1,
      deltaX: 10,
      deltaY: 20,
    };
    const history: HistoryState = {
      actions: [line, moveAction],
      redoActions: [],
    };

    const undone = undoHistory(history);
    expect(
      resolveBoardActions(undone.actions)
        .objects[0],
    ).toEqual(line);

    const redone = redoHistory(undone);
    expect(
      resolveBoardActions(redone.actions)
        .objects[0],
    ).toMatchObject({
      points: [20, 40, 40, 60],
    });
  });

  it("undoes and redoes a text edit action", () => {
    const editAction: BoardAction = {
      id: 3,
      type: "editText",
      targetId: 2,
      value: "Edited",
    };
    const history: HistoryState = {
      actions: [boardText, editAction],
      redoActions: [],
    };

    const undone = undoHistory(history);
    expect(
      resolveBoardActions(undone.actions)
        .objects[0],
    ).toMatchObject({ value: "Original" });

    const redone = redoHistory(undone);
    expect(
      resolveBoardActions(redone.actions)
        .objects[0],
    ).toMatchObject({ value: "Edited" });
  });
});
