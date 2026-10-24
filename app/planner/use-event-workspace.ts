"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPlan } from "../../domain/planner";
import { eventSchema, type Brief, type EventPlan } from "../../domain/schema";
import { localToday, shiftDate } from "../../domain/dates";
import {
  deleteEvent,
  importEvents,
  loadEvents,
  MAX_BACKUP_BYTES,
  saveEvent,
} from "../../storage/repository";

export type PlanUpdate = (plan: EventPlan) => EventPlan;

/** Owns browser persistence and revisions; views never write IndexedDB directly. */
export function useEventWorkspace() {
  const [events, setEvents] = useState<EventPlan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const active = events.find((event) => event.id === selected) ?? null;
  const activeRef = useRef<EventPlan | null>(null);
  const writes = useRef(Promise.resolve());
  const pendingWrites = useRef(0);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    let disposed = false;
    void loadEvents()
      .then((items) => {
        if (!disposed) {
          setEvents(items);
          setReady(true);
        }
      })
      .catch(() => {
        if (!disposed) {
          setError(
            "Saved events could not be opened. Check browser storage permissions before creating an event.",
          );
          setReady(true);
        }
      });
    return () => {
      disposed = true;
    };
  }, []);
  const getCurrent = useCallback(() => activeRef.current, []);
  const notify = useCallback((text: string) => {
    setMessage(text);
    setError("");
  }, []);
  function openEvent(id: string) {
    activeRef.current = events.find((event) => event.id === id) ?? null;
    setSelected(id);
    setError("");
  }
  function goHome() {
    activeRef.current = null;
    setSelected(null);
  }
  async function create(brief: Brief) {
    if (events.length >= 30)
      throw new Error(
        "You can keep up to 30 events. Export and remove one before continuing.",
      );
    const event = createPlan(brief);
    await saveEvent(event);
    setEvents((current) => [event, ...current]);
    activeRef.current = event;
    setSelected(event.id);
    notify("Your event plan is ready and saved in this browser.");
  }
  async function explore() {
    try {
      await create({
        title: "Maya & Arjun’s wedding",
        type: "wedding",
        date: shiftDate(localToday(), 90),
        location: "Jaipur, Rajasthan",
        guests: 150,
        budget: 60000000,
        currency: "INR",
        preferences:
          "An intimate garden wedding. Vegetarian food, seasonal flowers, step-free access, and personal touches.",
        timezone: "Asia/Kolkata",
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open the example.",
      );
    }
  }
  function commit(next: EventPlan, text = "Changes saved") {
    const current = getCurrent();
    if (!current || current.id !== next.id) return;
    const valid = eventSchema.parse({
      ...next,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    activeRef.current = valid;
    setEvents((items) =>
      items.map((event) => (event.id === valid.id ? valid : event)),
    );
    pendingWrites.current++;
    setSaving(true);
    // Recover the queue after failures so a later edit can still be saved.
    writes.current = writes.current
      .then(() => saveEvent(valid))
      .then(() => notify(text))
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Save failed. Export a backup before leaving.",
        );
      })
      .finally(() => {
        pendingWrites.current--;
        setSaving(pendingWrites.current > 0);
      });
  }
  function update(transform: PlanUpdate, text?: string) {
    const current = getCurrent();
    if (current) commit(transform(current), text);
  }
  async function remove() {
    const current = getCurrent();
    if (!current) return;
    await writes.current;
    await deleteEvent(current.id);
    setEvents((items) => items.filter((event) => event.id !== current.id));
    goHome();
    notify("Event removed from this browser.");
  }
  async function importBackup(file: File) {
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error("Backup must be smaller than 32 MB.");
    await writes.current;
    const imported = await importEvents(await file.text());
    setEvents(imported);
    notify("Backup imported as separate events.");
  }
  return {
    events,
    active,
    ready,
    message,
    error,
    saving,
    setError,
    notify,
    getCurrent,
    openEvent,
    goHome,
    create,
    explore,
    commit,
    update,
    remove,
    importBackup,
  };
}
