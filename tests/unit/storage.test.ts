import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteEvent,
  importEvents,
  loadEvents,
  openDatabase,
  saveEvent,
  MAX_BACKUP_BYTES,
} from "../../storage/repository";
import { createPlan } from "../../domain/planner";
import { backupJson } from "../../exports/files";
import { brief } from "./fixtures";
beforeEach(async () => {
  const events = await loadEvents();
  for (const event of events) await deleteEvent(event.id);
});
describe("transactional browser persistence", () => {
  it("creates, reads, edits and deletes across reopened connections", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    const db = await openDatabase();
    expect(db.objectStoreNames.contains("events")).toBe(true);
    db.close();
    expect((await loadEvents())[0]).toEqual(plan);
    const edited = {
      ...plan,
      revision: 1,
      updatedAt: "2026-10-24T12:00:00.000Z",
    };
    await saveEvent(edited, plan.revision);
    expect((await loadEvents())[0].revision).toBe(1);
    await deleteEvent(plan.id);
    expect(await loadEvents()).toEqual([]);
  });
  it("rejects stale writes without losing newer data", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent({ ...plan, revision: 3 }, null);
    await expect(
      saveEvent(
        {
          ...plan,
          revision: 1,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        0,
      ),
    ).rejects.toThrow("another tab");
    expect((await loadEvents())[0].revision).toBe(3);
  });
  it("imports separate copies and rejects invalid backups atomically", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    const imported = await importEvents(backupJson([plan]));
    expect(imported.length).toBe(2);
    expect(new Set(imported.map((item) => item.id)).size).toBe(2);
    await expect(importEvents('{"version":2,"events":[]}')).rejects.toThrow();
    await expect(
      importEvents("x".repeat(MAX_BACKUP_BYTES + 1)),
    ).rejects.toThrow("too large");
    expect((await loadEvents()).length).toBe(2);
  });
  it("limits backup imports to thirty events", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    await expect(
      importEvents(backupJson(Array.from({ length: 30 }, () => plan))),
    ).rejects.toThrow("30 events");
    expect((await loadEvents()).length).toBe(1);
  });
  it("rejects conflicting edits even when timestamps match, and permits identical retries", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    await saveEvent(plan, null);
    const changed = structuredClone(plan);
    changed.budget[0].paid = 123;
    await expect(saveEvent(changed, null)).rejects.toThrow("another tab");
    expect((await loadEvents())[0].budget[0].paid).toBe(0);
  });
  it("reports unavailable storage without pretending to save", async () => {
    const spy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => request.onerror?.call(request, new Event("error")));
      return request;
    });
    try {
      await expect(openDatabase()).rejects.toThrow("unavailable");
    } finally {
      spy.mockRestore();
    }
  });
  it("rolls back interrupted writes and imports while preserving saved events", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    const original = IDBObjectStore.prototype.put;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<typeof original>
      ) {
        const request = original.apply(this, args);
        queueMicrotask(() => {
          try {
            this.transaction.abort();
          } catch {
            /* already aborted */
          }
        });
        return request;
      });
    try {
      await expect(saveEvent({ ...plan, revision: 1 }, 0)).rejects.toThrow(
        "Storage failed",
      );
      await expect(importEvents(backupJson([plan]))).rejects.toThrow(
        "Existing events were preserved",
      );
    } finally {
      spy.mockRestore();
    }
    expect((await loadEvents()).length).toBe(1);
    expect((await loadEvents())[0].revision).toBe(0);
  });
  it("reports a failed delete transaction and retains the event", async () => {
    const plan = createPlan(brief, "2026-10-24");
    await saveEvent(plan, null);
    const original = IDBObjectStore.prototype.delete;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "delete")
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<typeof original>
      ) {
        const request = original.apply(this, args);
        this.transaction.abort();
        return request;
      });
    try {
      await expect(deleteEvent(plan.id)).rejects.toThrow("Could not save");
    } finally {
      spy.mockRestore();
    }
    expect((await loadEvents()).length).toBe(1);
  });
});
