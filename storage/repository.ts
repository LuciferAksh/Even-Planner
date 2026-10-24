import { backupSchema, eventSchema, type EventPlan } from "../domain/schema";

const DATABASE = "gather-planner";
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
export async function saveEvent(plan: EventPlan): Promise<void> {
  const valid = eventSchema.parse(plan);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const read = store.get(valid.id);
    let conflict = false;
    read.onsuccess = () => {
      const existing = read.result as EventPlan | undefined;
      if (
        existing &&
        (existing.revision > valid.revision ||
          (existing.revision === valid.revision &&
            JSON.stringify(existing) !== JSON.stringify(valid)))
      ) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put(valid);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          conflict
            ? "This event changed in another tab. Reload before editing to avoid losing changes."
            : "Storage failed. Export a backup before leaving.",
        ),
      );
    };
  });
}
export async function deleteEvent(id: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(id));
}
export async function importEvents(raw: string): Promise<EventPlan[]> {
  if (raw.length > 2_000_000)
    throw new Error("Backup is too large (maximum 2 MB).");
  const incoming = backupSchema.parse(JSON.parse(raw)).events;
  const current = await loadEvents();
  const merged = new Map(current.map((event) => [event.id, event]));
  const additions: EventPlan[] = [];
  // Imported copies get new IDs: never silently overwrite an existing event.
  for (const event of incoming) {
    const copy = {
      ...event,
      id: crypto.randomUUID(),
      revision: 0,
      updatedAt: new Date().toISOString(),
    };
    merged.set(copy.id, copy);
    additions.push(copy);
  }
  if (merged.size > 30)
    throw new Error(
      "Keep up to 30 events. Remove an event before importing this backup.",
    );
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    // Write imported copies only; never overwrite a newer edit in another tab.
    for (const event of additions) tx.objectStore("events").put(event);
    tx.oncomplete = () => {
      db.close();
      resolve([...merged.values()]);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(
        new Error("Could not import backup. Existing events were preserved."),
      );
    };
  });
}
