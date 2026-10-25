import type { EventPlan } from "../domain/schema";
import { saveEvent } from "./repository";

type Writer = typeof saveEvent;

/** A failed write invalidates later optimistic revisions for that event. */
export class EventWriteQueue {
  private tail: Promise<void> = Promise.resolve();
  private failures = new Map<string, Error>();
  constructor(private readonly writer: Writer = saveEvent) {}

  failure(id: string): Error | undefined {
    return this.failures.get(id);
  }

  enqueue(plan: EventPlan, expectedRevision: number): Promise<void> {
    const result = this.tail.then(async () => {
      const failure = this.failure(plan.id);
      if (failure) throw failure;
      await this.writer(plan, expectedRevision);
    });
    // Recover the queue for other events, while retaining the failed event's block.
    this.tail = result.catch((cause: unknown) => {
      this.failures.set(
        plan.id,
        cause instanceof Error
          ? cause
          : new Error(
              "Storage failed. Export your unsaved copy, then reload before editing.",
            ),
      );
    });
    return result;
  }

  async flush(): Promise<void> {
    await this.tail;
  }
}
