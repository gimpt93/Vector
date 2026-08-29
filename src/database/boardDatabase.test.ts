import { describe, expect, it, vi } from "vitest";
import { saveBoard } from "./boardDatabase";

const { loadDatabase } = vi.hoisted(() => ({
  loadDatabase: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: loadDatabase,
  },
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

describe("saveBoard", () => {
  it("finishes SQLite saves in the order they were requested", async () => {
    const firstWrite = deferred<{ rowsAffected: number }>();
    const execute = vi
      .fn()
      .mockImplementationOnce(() => firstWrite.promise)
      .mockResolvedValueOnce({ rowsAffected: 1 });

    loadDatabase.mockResolvedValue({ execute });

    const olderSave = saveBoard(1, "older state");
    const newerSave = saveBoard(1, "newer state");

    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(1);
    });
    expect(execute.mock.calls[0]?.[1]).toEqual([1, "older state"]);

    firstWrite.resolve({ rowsAffected: 1 });
    await olderSave;
    await newerSave;

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1]?.[1]).toEqual([1, "newer state"]);
  });
});
