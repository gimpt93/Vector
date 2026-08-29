import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type DesktopBoardController = {
  isDesktopBoardMode: boolean;
  isParked: boolean;
  toggle: () => Promise<void>;
  park: () => Promise<void>;
  exit: () => Promise<void>;
};

/**
 * Owns the desktop-board overlay state machine: enter, leave, park,
 * and the Ctrl+Shift+V shortcut. Encapsulates the Tauri window
 * side-effects so `Canvas.tsx` can stay focused on board editing.
 */
export function useDesktopBoardOverlay(
  onExit: () => void,
): DesktopBoardController {
  const [isDesktopBoardMode, setIsDesktopBoardMode] =
    useState(false);
  const [isParked, setIsParked] = useState(false);
  const desktopBoardModeRef = useRef(false);
  const parkedRef = useRef(false);

  useEffect(() => {
    desktopBoardModeRef.current = isDesktopBoardMode;
  }, [isDesktopBoardMode]);

  useEffect(() => {
    parkedRef.current = isParked;
  }, [isParked]);

  const changeWindow = useCallback(
    async (nextMode: boolean) => {
      const currentWindow = getCurrentWindow();

      if (parkedRef.current) {
        await currentWindow.setIgnoreCursorEvents(false);
        parkedRef.current = false;
        setIsParked(false);
      }

      if (nextMode) {
        await currentWindow.setIgnoreCursorEvents(false);
        await currentWindow.setAlwaysOnTop(false);
        await currentWindow.setFullscreen(false);
        await currentWindow.setDecorations(false);
        await currentWindow.maximize();
        await currentWindow.setAlwaysOnBottom(true);
      } else {
        await currentWindow.setAlwaysOnBottom(false);
        await currentWindow.unmaximize();
        await currentWindow.setDecorations(true);
        await currentWindow.setFocus();
      }

      desktopBoardModeRef.current = nextMode;
      setIsDesktopBoardMode(nextMode);
    },
    [],
  );

  const park = useCallback(async () => {
    if (!desktopBoardModeRef.current || parkedRef.current) {
      return;
    }

    parkedRef.current = true;
    setIsParked(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve()),
      );
    });

    try {
      await getCurrentWindow().setIgnoreCursorEvents(true);
    } catch (error) {
      parkedRef.current = false;
      setIsParked(false);
      throw error;
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      await changeWindow(!isDesktopBoardMode);
    } catch (error) {
      console.error("Could not change desktop board mode:", error);
    }
  }, [changeWindow, isDesktopBoardMode]);

  const exit = useCallback(async () => {
    if (isDesktopBoardMode) {
      await changeWindow(false);
    }
    onExit();
  }, [changeWindow, isDesktopBoardMode, onExit]);

  // Bind the global Ctrl+Shift+V shortcut to the overlay state machine.
  useEffect(() => {
    async function handleShortcut() {
      if (!desktopBoardModeRef.current) {
        await changeWindow(true);
        return;
      }

      if (parkedRef.current) {
        const currentWindow = getCurrentWindow();
        await currentWindow.setIgnoreCursorEvents(false);
        await currentWindow.setFocus();
        parkedRef.current = false;
        setIsParked(false);
        return;
      }

      await park();
    }

    function onShortcut() {
      void handleShortcut().catch((error) => {
        console.error("Could not toggle Vector desktop board:", error);
      });
    }

    window.addEventListener("vector:overlay-shortcut", onShortcut);
    return () => {
      window.removeEventListener(
        "vector:overlay-shortcut",
        onShortcut,
      );
    };
  }, [changeWindow, park]);

  return {
    isDesktopBoardMode,
    isParked,
    toggle,
    park,
    exit,
  };
}
