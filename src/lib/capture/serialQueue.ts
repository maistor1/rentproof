export interface SerialQueue {
  enqueue(task: () => Promise<void>): Promise<void>;
}

// Runs tasks one after another. Uploads go through this so the rental record
// never sees two writes at once, and the last accepted shot wins.
export function createSerialQueue(): SerialQueue {
  let tail: Promise<void> = Promise.resolve();
  return {
    enqueue(task) {
      const run = tail.then(task);
      tail = run.catch(() => undefined);
      return run;
    },
  };
}
