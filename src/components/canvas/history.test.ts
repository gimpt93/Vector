import { describe, expect, it } from "vitest";
import type {
  BoardAction,
  BoardObject,
  HistoryState,
  TextAction,
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

  it("applies the absolute move position for text", () => {
    const resolved = resolveBoardActions([
      line,
      boardText,
      {
        id: 3,
        type: "move",
        targetId: 2,
        x: 100,
        y: 200,
      },
    ]);

    expect(resolved.objects[1]).toMatchObject({
      id: 2,
      x: 100,
      y: 200,
    });
  });

  it("replaces line points with the absolute move payload", () => {
    const resolved = resolveBoardActions([
      line,
      {
        id: 3,
        type: "move",
        targetId: 1,
        points: [50, 60, 70, 80],
      },
    ]);

    expect(resolved.objects[0]).toMatchObject({
      id: 1,
      points: [50, 60, 70, 80],
    });
  });

  it("uses the last move action for an object", () => {
    // Two absolute moves in a row: the second one wins, regardless
    // of what came before.
    const resolved = resolveBoardActions([
      boardText,
      {
        id: 3,
        type: "move",
        targetId: 2,
        x: 70,
        y: 80,
      },
      {
        id: 4,
        type: "move",
        targetId: 2,
        x: 15,
        y: 25,
      },
    ]);

    expect(resolved.objects[0]).toMatchObject({
      id: 2,
      x: 15,
      y: 25,
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
        x: 70,
        y: 90,
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
        x: 10,
        y: 20,
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
        points: [20, 40, 40, 60],
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
      points: [20, 40, 40, 60],
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

  it("a move action is idempotent under replay", () => {
    // Apply the same move action twice in a row. Because the action
    // is absolute, the resolved state should be identical, not
    // double-moved.
    const moveAction: BoardAction = {
      id: 3,
      type: "move",
      targetId: 2,
      x: 200,
      y: 300,
    };
    const resolved = resolveBoardActions([
      boardText,
      moveAction,
      moveAction,
    ]);

    expect(resolved.objects[0]).toMatchObject({
      x: 200,
      y: 300,
    });
  });
});

describe("history property: undo/redo round-trip", () => {
  // Tiny seeded RNG so the test is deterministic.
  function makeRng(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
  }

  function pick<T>(rng: () => number, items: T[]): T {
    return items[Math.floor(rng() * items.length)]!;
  }

  // pick() is kept around as a helper for future action generators
  // even though current generation uses targeted live-object picking.
  void pick;

  function apply(
    history: HistoryState,
    action: BoardAction,
  ): HistoryState {
    return {
      actions: [...history.actions, action],
      redoActions: [],
    };
  }

  function generateActions(seed: number, count: number) {
    const rng = makeRng(seed);
    const actions: BoardAction[] = [];
    let nextId = 1;
    // Seed a small population of objects we can mutate.
    const seeded: BoardAction[] = [
      {
        id: nextId++,
        type: "line",
        points: [0, 0, 10, 10],
        color: "#111111",
        width: 4,
        lineTool: "draw",
      },
      {
        id: nextId++,
        type: "text",
        x: 20,
        y: 30,
        value: "hello",
        color: "#2563eb",
        fontSize: 24,
      },
    ];
    actions.push(...seeded);

    for (let i = 0; i < count; i++) {
      const roll = rng();
      if (roll < 0.25) {
        // Draw a new line.
        actions.push({
          id: nextId++,
          type: "line",
          points: [rng() * 100, rng() * 100, rng() * 100, rng() * 100],
          color: "#111111",
          width: 4,
          lineTool: "draw",
        });
      } else if (roll < 0.4) {
        // Add new text.
        actions.push({
          id: nextId++,
          type: "text",
          x: rng() * 100,
          y: rng() * 100,
          value: `t${i}`,
          color: "#2563eb",
          fontSize: 24,
        });
      } else if (roll < 0.7) {
        // Move an existing live object.
        const target = pickLiveObject(actions);
        if (!target) continue;
        if (target.type === "line") {
          const dx = (rng() - 0.5) * 20;
          const dy = (rng() - 0.5) * 20;
          actions.push({
            id: nextId++,
            type: "move",
            targetId: target.id,
            points: target.points.map(
              (c, idx) =>
                c + (idx % 2 === 0 ? dx : dy),
            ),
          });
        } else {
          actions.push({
            id: nextId++,
            type: "move",
            targetId: target.id,
            x: target.x + (rng() - 0.5) * 20,
            y: target.y + (rng() - 0.5) * 20,
          });
        }
      } else if (roll < 0.85) {
        // Edit text on a live text object.
        const target = pickLiveText(actions);
        if (!target) continue;
        actions.push({
          id: nextId++,
          type: "editText",
          targetId: target.id,
          value: `e${i}`,
        });
      } else {
        // Delete a live object.
        const target = pickLiveObject(actions);
        if (!target) continue;
        actions.push({
          id: nextId++,
          type: "delete",
          targetId: target.id,
        });
      }
    }

    return actions;
  }

  function pickLiveObject(
    actions: BoardAction[],
  ): BoardObject | null {
    const resolved = resolveBoardActions(actions);
    return resolved.objects[0] ?? null;
  }

  function pickLiveText(
    actions: BoardAction[],
  ): TextAction | null {
    const resolved = resolveBoardActions(actions);
    const found = resolved.objects.find(
      (o) => o.type === "text",
    );
    return (found as TextAction | undefined) ?? null;
  }

  it("100 random actions → 100 undos → 100 redos returns to the same board", () => {
    const actions = generateActions(42, 100);
    const start: HistoryState = {
      actions: [],
      redoActions: [],
    };

    let history = start;
    for (const action of actions) {
      history = apply(history, action);
    }
    const finalState = resolveBoardActions(history.actions);

    // Undo everything.
    let undone = history;
    for (let i = 0; i < actions.length; i++) {
      undone = undoHistory(undone);
    }
    expect(undone.actions).toEqual([]);
    expect(
      resolveBoardActions(undone.actions).objects,
    ).toEqual([]);

    // Redo everything.
    let redone = undone;
    for (let i = 0; i < actions.length; i++) {
      redone = redoHistory(redone);
    }

    expect(
      resolveBoardActions(redone.actions).objects,
    ).toEqual(finalState.objects);
    expect(
      resolveBoardActions(redone.actions)
        .deletedActionIds,
    ).toEqual(finalState.deletedActionIds);
  });

  it("a sequence of move-then-undo-then-redo on a text object converges to the moved position", () => {
    const moveA: BoardAction = {
      id: 3,
      type: "move",
      targetId: 2,
      x: 50,
      y: 50,
    };
    const moveB: BoardAction = {
      id: 4,
      type: "move",
      targetId: 2,
      x: 30,
      y: 70,
    };
    const history: HistoryState = {
      actions: [boardText, moveA, moveB],
      redoActions: [],
    };

    const undone = undoHistory(history);
    // After undoing moveB, text should be at (50, 50).
    expect(
      resolveBoardActions(undone.actions).objects[0],
    ).toMatchObject({ x: 50, y: 50 });

    const undoneTwice = undoHistory(undone);
    // After undoing moveA too, text should be at the original (50, 60).
    expect(
      resolveBoardActions(undoneTwice.actions).objects[0],
    ).toMatchObject({ x: 50, y: 60 });

    const redoneOnce = redoHistory(undoneTwice);
    expect(
      resolveBoardActions(redoneOnce.actions).objects[0],
    ).toMatchObject({ x: 50, y: 50 });

    const redoneTwice = redoHistory(redoneOnce);
    expect(
      resolveBoardActions(redoneTwice.actions).objects[0],
    ).toMatchObject({ x: 30, y: 70 });
  });
});
