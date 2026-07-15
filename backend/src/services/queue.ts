type Task = () => Promise<void>;

class TaskQueue {
  private queue: Task[] = [];
  private running = false;

  public push(task: Task) {
    this.queue.push(task);
    this.runNext();
  }

  private async runNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;

    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error('TaskQueue execution error:', err);
      }
    }

    this.running = false;
    this.runNext();
  }
}

export const imageQueue = new TaskQueue();
