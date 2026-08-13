import "./App.css";
import { useEffect, useState } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import Canvas from "./components/Canvas";
import BoardHome from "./components/BoardHome";
import type { BoardSummary } from "./database/boardDatabase";

function App() {
  const [activeBoard, setActiveBoard] = useState<BoardSummary | null>(null);

  useEffect(() => {
    const shortcut = "CommandOrControl+Shift+V";

    async function setupShortcut() {
      try {
        await unregister(shortcut).catch(() => undefined);
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            window.dispatchEvent(new CustomEvent("vector:overlay-shortcut"));
          }
        });
      } catch (error) {
        console.error("Could not register Vector shortcut:", error);
      }
    }

    void setupShortcut();

    return () => {
      void unregister(shortcut).catch(() => undefined);
    };
  }, []);

  return activeBoard ? (
    <Canvas
      key={activeBoard.id}
      board={activeBoard}
      onExit={() => setActiveBoard(null)}
    />
  ) : (
    <BoardHome onOpenBoard={setActiveBoard} />
  );
}

export default App;
