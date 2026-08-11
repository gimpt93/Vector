import Database from "@tauri-apps/plugin-sql";

const DATABASE_PATH = "sqlite:vector.db";
const BOARD_ID = 1;

let databasePromise: Promise<Database> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_PATH);
  }

  return databasePromise;
}

export async function loadBoard(): Promise<string | null> {
  const database = await getDatabase();

  const rows = await database.select<
    { board_data: string }[]
  >(
    `
      SELECT board_data
      FROM vector_board
      WHERE id = $1
    `,
    [BOARD_ID],
  );

  return rows[0]?.board_data ?? null;
}

export async function saveBoard(
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
    [BOARD_ID, boardData],
  );
}