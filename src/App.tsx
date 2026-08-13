import "./App.css";
import { useState } from "react";
import Canvas from "./components/Canvas";
import BoardHome from "./components/BoardHome";
import type { BoardSummary } from "./database/boardDatabase";

function App() {
  const [activeBoard, setActiveBoard] = useState<BoardSummary | null>(null);

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
