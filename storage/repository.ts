import {
  backupSchema,
  eventSchema,
  MAX_EVENTS,
  type EventPlan,
} from "../domain/schema";

const DATABASE = "gather-planner";
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("events", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Browser storage is unavailable. Export a backup before leaving.",
        ),
      );
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", mode);
    const request = operation(tx.objectStore("events"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not save your event. Export a backup and check available browser storage.",
        ),
      );
    };
  });
}
export async function loadEvents(): Promise<EventPlan[]> {
  const records = await transaction("readonly", (store) => store.getAll());
  return backupSchema
    .parse({ version: 1, events: records })
    .events.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export class SaveConflictError extends Error {
  constructor() {
    super(
      "This event changed in another tab. Export your unsaved copy if needed, then reload before editing to avoid losing changes.",
    );
    this.name = "SaveConflictError";
  }
}
export class EventCapacityError extends Error {
  constructor() {
    super(
      `Keep up to ${MAX_EVENTS} events. Remove an event before creating or importing another.`,
    );
    this.name = "EventCapacityError";
  }
}

/** Compare against the revision actually read by the caller, inside one transaction. */
export async function saveEvent(
  plan: EventPlan,
  expectedRevision: number | null,
): Promise<void> {
  const valid = eventSchema.parse(plan);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const read = store.get(valid.id);
    let failure: Error | undefined;
    read.onsuccess = () => {
      const existing = read.result as EventPlan | undefined;
      // An exact retry is safe even if the previous acknowledgement was lost.
      if (existing && JSON.stringify(existing) === JSON.stringify(valid))
        return;
      const actualRevision = existing?.revision ?? null;
      if (
        actualRevision !== expectedRevision ||
        (expectedRevision !== null && valid.revision !== expectedRevision + 1)
      ) {
        failure = new SaveConflictError();
        tx.abort();
        return;
      }
      if (existing) {
        store.put(valid);
        return;
      }
      // The count and insert share the write transaction, including across tabs.
      const count = store.count();
      count.onsuccess = () => {
        if (count.result >= MAX_EVENTS) {
          failure = new EventCapacityError();
          tx.abort();
          return;
        }
        store.put(valid);
      };
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        failure ?? new Error("Storage failed. Export a backup before leaving."),
      );
    };
  });
}
export async function deleteEvent(id: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(id));
}
export async function importEvents(raw: string): Promise<EventPlan[]> {
  if (raw.length > MAX_BACKUP_BYTES)
    throw new Error("Backup is too large (maximum 32 MB).");
  const incoming = backupSchema.parse(JSON.parse(raw)).events;
  // Imported copies get new IDs: never silently overwrite an existing event.
  const additions = incoming.map((event) => ({
    ...event,
    id: crypto.randomUUID(),
    revision: 0,
    updatedAt: new Date().toISOString(),
  }));
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    let capacityExceeded = false;
    const count = store.count();
    count.onsuccess = () => {
      if (count.result + additions.length > MAX_EVENTS) {
        capacityExceeded = true;
        tx.abort();
        return;
      }
      for (const event of additions) store.put(event);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(
        capacityExceeded
          ? new EventCapacityError()
          : new Error(
              "Could not import backup. Existing events were preserved.",
            ),
      );
    };
  });
  return loadEvents();
}
