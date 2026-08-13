import { useEffect, useState } from "react";
import {
  createBoard,
  deleteBoard,
  listBoards,
  renameBoard,
  type BoardSummary,
} from "../database/boardDatabase";

type BoardHomeProps = {
  onOpenBoard: (board: BoardSummary) => void;
};

export default function BoardHome({ onOpenBoard }: BoardHomeProps) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshBoards() {
    setBoards(await listBoards());
    setIsLoading(false);
  }

  useEffect(() => {
    void refreshBoards();
  }, []);

  async function addBoard() {
    const name = window.prompt("Name your board", "Untitled board")?.trim();
    if (!name) return;
    const id = await createBoard(name);
    onOpenBoard({ id, name, updatedAt: new Date().toISOString() });
  }

  async function editName(board: BoardSummary) {
    const name = window.prompt("Rename board", board.name)?.trim();
    if (!name || name === board.name) return;
    await renameBoard(board.id, name);
    await refreshBoards();
  }

  async function removeBoard(board: BoardSummary) {
    if (!window.confirm(`Delete “${board.name}”? This cannot be undone.`)) return;
    await deleteBoard(board.id);
    await refreshBoards();
  }

  return (
    <main className="board-home">
      <header className="home-header">
        <div><span className="brand-mark">V</span><span className="home-brand">Vector</span></div>
        <button className="primary-button" type="button" onClick={addBoard}>+ New board</button>
      </header>

      <section className="boards-section">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Pick up where you left off.</h1>
        <p className="home-subtitle">A quiet space to sketch, think, and make ideas visible.</p>

        {isLoading ? <p className="empty-state">Opening your workspace…</p> : boards.length === 0 ? (
          <button className="empty-state empty-state--action" type="button" onClick={addBoard}>
            <strong>Create your first board</strong><span>Start with a blank canvas</span>
          </button>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <article className="board-card" key={board.id} onClick={() => onOpenBoard(board)}>
                <div className="board-preview"><span>{board.name.slice(0, 1).toUpperCase()}</span></div>
                <div className="board-card-meta">
                  <div><h2>{board.name}</h2><p>Edited {new Date(`${board.updatedAt}Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div>
                  <div className="board-actions">
                    <button type="button" title="Rename" onClick={(event) => { event.stopPropagation(); void editName(board); }}>Rename</button>
                    <button type="button" className="danger-action" title="Delete" onClick={(event) => { event.stopPropagation(); void removeBoard(board); }}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
