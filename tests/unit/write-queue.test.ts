import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { createPlan } from "../../domain/planner";
import {
  deleteEvent,
  loadEvents,
  saveEvent,
  SaveConflictError,
} from "../../storage/repository";
import { EventWriteQueue } from "../../storage/write-queue";
import { brief } from "./fixtures";

describe("revision compare-and-swap", () => {
  it("rejects a skipped base revision and does not resurrect a deleted event", async () => {
    const base = createPlan(brief, "2026-10-24");
    await saveEvent(base, null);
    await expect(saveEvent({ ...base, revision: 2 }, 0)).rejects.toBeInstanceOf(
      SaveConflictError,
    );
    await expect(saveEvent({ ...base, revision: 3 }, 2)).rejects.toBeInstanceOf(
      SaveConflictError,
    );
    await deleteEvent(base.id);
    await expect(saveEvent({ ...base, revision: 1 }, 0)).rejects.toBeInstanceOf(
      SaveConflictError,
    );
    expect(
      (await loadEvents()).find((event) => event.id === base.id),
    ).toBeUndefined();
  });

  it("blocks edits queued after a conflict without losing another tab’s payment", async () => {
    const base = createPlan(brief, "2026-10-24");
    await saveEvent(base, null);
    const saved = structuredClone(base);
    saved.revision = 1;
    saved.budget[0].paid = 12300;
    await saveEvent(saved, 0);
    const queue = new EventWriteQueue();
    const stale = {
      ...base,
      revision: 1,
      brief: { ...base.brief, preferences: "Second tab" },
    };
    // Both edits enter the queue before the first conflict is reported.
    const results = await Promise.allSettled([
      queue.enqueue(stale, 0),
      queue.enqueue({ ...stale, revision: 2 }, 1),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    await expect(
      queue.enqueue({ ...stale, revision: 3 }, 2),
    ).rejects.toBeInstanceOf(SaveConflictError);
    await queue.flush();
    expect(queue.failure(base.id)).toBeInstanceOf(SaveConflictError);
    const stored = (await loadEvents()).find((event) => event.id === base.id);
    expect(stored?.budget[0].paid).toBe(12300);
    // A fresh workspace reads and edits the current saved revision normally.
    const refreshed = new EventWriteQueue();
    await refreshed.enqueue(
      {
        ...saved,
        revision: 2,
        brief: { ...saved.brief, preferences: "Freshly reloaded" },
      },
      1,
    );
    expect(
      (await loadEvents()).find((event) => event.id === base.id)?.brief
        .preferences,
    ).toBe("Freshly reloaded");
  });

  it("preserves write order and keeps other events usable after a storage failure", async () => {
    const first = createPlan(brief, "2026-10-24");
    const second = createPlan(brief, "2026-10-24");
    const writer = vi
      .fn()
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValue(undefined);
    const queue = new EventWriteQueue(writer);
    const outcomes = await Promise.allSettled([
      queue.enqueue({ ...first, revision: 1 }, 0),
      queue.enqueue({ ...first, revision: 2 }, 1),
      queue.enqueue({ ...second, revision: 1 }, 0),
    ]);
    expect(outcomes.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
      "fulfilled",
    ]);
    expect(writer.mock.calls.map(([plan]) => plan.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(queue.failure(second.id)).toBeUndefined();
    await queue.flush();
  });

  it("normalizes an unknown storage failure and blocks subsequent edits", async () => {
    const event = createPlan(brief, "2026-10-24");
    const queue = new EventWriteQueue(
      vi.fn().mockRejectedValue("unknown failure"),
    );
    await expect(queue.enqueue({ ...event, revision: 1 }, 0)).rejects.toBe(
      "unknown failure",
    );
    await queue.flush();
    expect(queue.failure(event.id)?.message).toContain("reload");
    await expect(queue.enqueue({ ...event, revision: 2 }, 1)).rejects.toThrow(
      "reload",
    );
  });
});
