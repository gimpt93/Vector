import Database from "@tauri-apps/plugin-sql";

const DATABASE_PATH = "sqlite:vector.db";
export type BoardSummary = {
  id: number;
  name: string;
  updatedAt: string;
};

let databasePromise: Promise<Database> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_PATH);
  }

  return databasePromise;
}

export async function listBoards(): Promise<BoardSummary[]> {
  const database = await getDatabase();
  const rows = await database.select<
    { id: number; name: string; updated_at: string }[]
  >(`SELECT id, name, updated_at FROM vector_board ORDER BY updated_at DESC`);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
  }));
}

export async function createBoard(name: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    `INSERT INTO vector_board (name, board_data, updated_at)
     VALUES ($1, '[]', CURRENT_TIMESTAMP)`,
    [name],
  );

  if (result.lastInsertId === undefined) {
    throw new Error("Vector could not identify the new board.");
  }

  return result.lastInsertId;
}

export async function renameBoard(id: number, name: string): Promise<void> {
  const database = await getDatabase();
  await database.execute(
    `UPDATE vector_board SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [name, id],
  );
}

export async function deleteBoard(id: number): Promise<void> {
  const database = await getDatabase();
  await database.execute(`DELETE FROM vector_board WHERE id = $1`, [id]);
}

export async function loadBoard(boardId: number): Promise<string | null> {
  const database = await getDatabase();

  const rows = await database.select<
    { board_data: string }[]
  >(
    `
      SELECT board_data
      FROM vector_board
      WHERE id = $1
    `,
    [boardId],
  );

  return rows[0]?.board_data ?? null;
}

export async function saveBoard(
  boardId: number,
  boardData: string,
): Promise<void> {
  const database = await getDatabase();

  await database.execute(
    `
      INSERT INTO vector_board (
        id,
        board_data,
        updated_at
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        board_data = excluded.board_data,
        updated_at = CURRENT_TIMESTAMP
    `,
    [boardId, boardData],
  );
}
