type RenderTask = {
  pageNumber: number;
  priority: number;
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

export class RenderQueue {
  private queue: RenderTask[] = [];
  private processing = false;
  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private debounceMs: number;

  constructor(debounceMs = 50) {
    this.debounceMs = debounceMs;
  }

  enqueue(pageNumber: number, execute: () => Promise<void>, priority = 0): Promise<void> {
    // Cancel any pending debounced render for this page
    const existingTimer = this.debounceTimers.get(pageNumber);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Remove any queued (not-yet-started) renders for the same page
    this.queue = this.queue.filter((t) => t.pageNumber !== pageNumber);

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.debounceTimers.delete(pageNumber);
        // Insert at correct position based on priority (ascending: lower = higher priority)
        const task: RenderTask = { pageNumber, priority, execute, resolve, reject };
        const insertIndex = this.queue.findIndex((t) => t.priority > priority);
        if (insertIndex === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(insertIndex, 0, task);
        }
        this.processQueue();
      }, this.debounceMs);

      this.debounceTimers.set(pageNumber, timer);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        await task.execute();
        task.resolve();
      } catch (err) {
        task.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    this.processing = false;
  }

  clear(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    for (const task of this.queue) {
      task.reject(new Error('Render queue cleared'));
    }
    this.queue = [];
  }
}
