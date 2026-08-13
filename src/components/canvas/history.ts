import type {
  BoardAction,
  BoardObject,
  HistoryState,
} from "./boardTypes";

export type ResolvedBoard = {
  objects: BoardObject[];
  deletedActionIds: Set<number>;
};

export function resolveBoardActions(
  actions: BoardAction[],
): ResolvedBoard {
  const objectsById = new Map<
    number,
    BoardObject
  >();
  const objectIds: number[] = [];
  const deletedActionIds = new Set<number>();

  for (const action of actions) {
    if (
      action.type === "line" ||
      action.type === "text"
    ) {
      objectsById.set(action.id, action);
      objectIds.push(action.id);
      continue;
    }

    if (action.type === "delete") {
      deletedActionIds.add(action.targetId);
      continue;
    }

    const target = objectsById.get(
      action.targetId,
    );

    if (!target) {
      continue;
    }

    if (action.type === "move") {
      if (target.type === "line") {
        objectsById.set(target.id, {
          ...target,
          points: target.points.map(
            (coordinate, index) =>
              coordinate +
              (index % 2 === 0
                ? action.deltaX
                : action.deltaY),
          ),
        });
      } else {
        objectsById.set(target.id, {
          ...target,
          x: target.x + action.deltaX,
          y: target.y + action.deltaY,
        });
      }

      continue;
    }

    if (target.type === "text") {
      objectsById.set(target.id, {
        ...target,
        value: action.value,
        fontSize: action.fontSize ?? target.fontSize,
        fontWeight: action.fontWeight ?? target.fontWeight,
      });
    }
  }

  return {
    objects: objectIds.flatMap((id) => {
      const object = objectsById.get(id);
      return object ? [object] : [];
    }),
    deletedActionIds,
  };
}

export function undoHistory(
  current: HistoryState,
): HistoryState {
  if (current.actions.length === 0) {
    return current;
  }

  const removedAction =
    current.actions[current.actions.length - 1];

  return {
    actions: current.actions.slice(0, -1),
    redoActions: [
      ...current.redoActions,
      removedAction,
    ],
  };
}

export function redoHistory(
  current: HistoryState,
): HistoryState {
  if (current.redoActions.length === 0) {
    return current;
  }

  const restoredAction =
    current.redoActions[
      current.redoActions.length - 1
    ];

  return {
    actions: [
      ...current.actions,
      restoredAction,
    ],
    redoActions: current.redoActions.slice(0, -1),
  };
}
