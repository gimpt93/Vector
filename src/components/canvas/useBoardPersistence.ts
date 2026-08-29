import { useEffect, useState } from "react";
import {
  loadBoard,
  saveBoard,
} from "../../database/boardDatabase";
import type { BoardAction, HistoryState } from "./boardTypes";

export type SaveStatus = "loading" | "saving" | "saved" | "error";

export type BoardPersistence = {
  history: HistoryState;
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
  isLoaded: boolean;
  saveStatus: SaveStatus;
  /** Returns the next available action id (and bumps the counter). */
  nextId: () => number;
};

/**
 * Loads a board from the local SQLite database on mount and
 * debounce-saves it whenever the action log changes. Also owns the
 * monotonic action-id counter so all action generators in the
 * component get a stable source of ids.
 */
export function useBoardPersistence(
  boardId: number,
  initialHistory: HistoryState,
): BoardPersistence {
  const [history, setHistory] = useState<HistoryState>(initialHistory);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [nextIdCounter, setNextIdCounter] = useState(1);

  // Load the saved board on first mount or when switching boards.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const savedBoard = await loadBoard(boardId);

        if (cancelled) {
          return;
        }

        if (savedBoard) {
          const savedActions = JSON.parse(savedBoard) as BoardAction[];

          setHistory({
            actions: savedActions,
            redoActions: [],
          });

          const highestId = savedActions.reduce(
            (highest, action) => Math.max(highest, action.id),
            0,
          );
          setNextIdCounter(highestId + 1);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Could not load Vector board:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Debounce-save the action log whenever it changes.
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    setSaveStatus("saving");

    const saveTimer = window.setTimeout(async () => {
      try {
        await saveBoard(boardId, JSON.stringify(history.actions));
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        console.error("Could not save Vector board:", error);
      }
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [history.actions, isLoaded, boardId]);

  // Functional setter: callers should use setHistory's functional form
  // when bumping the id, and use the latest committed value.
  function nextId() {
    const id = nextIdCounter;
    setNextIdCounter(id + 1);
    return id;
  }

  return {
    history,
    setHistory,
    isLoaded,
    saveStatus,
    nextId,
  };
}
