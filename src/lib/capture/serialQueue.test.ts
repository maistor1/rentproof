import { describe, expect, it } from "vitest";
import { createSerialQueue } from "@/lib/capture/serialQueue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createSerialQueue", () => {
  it("runs one task at a time in order", async () => {
    const queue = createSerialQueue();
    const log: string[] = [];
    const gate = deferred();
    const a = queue.enqueue(async () => {
      log.push("a:start");
      await gate.promise;
      log.push("a:end");
    });
    const b = queue.enqueue(async () => {
      log.push("b");
    });
    await Promise.resolve();
    expect(log).toEqual(["a:start"]);
    gate.resolve();
    await Promise.all([a, b]);
    expect(log).toEqual(["a:start", "a:end", "b"]);
  });

  it("keeps going after a task fails", async () => {
    const queue = createSerialQueue();
    const failing = queue.enqueue(async () => {
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");
    let ran = false;
    await queue.enqueue(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
