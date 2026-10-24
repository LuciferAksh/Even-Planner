"use client";
import { HomeScreen } from "./home";
import { Overview } from "./overview";
import { Vendors } from "./vendors";
import { Ideas } from "./ideas";
import { Chat } from "./chat";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  Flower2,
  Users,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  aiDraftSchema,
  eventSchema,
  type Brief,
  type EventPlan,
} from "../../domain/schema";
import { createPlan, applyAiDraft } from "../../domain/planner";
import { dateLabel, localToday, shiftDate } from "../../domain/dates";

import {
  loadEvents,
  saveEvent,
  deleteEvent,
  importEvents,
  MAX_BACKUP_BYTES,
} from "../../storage/repository";
import { calendarFile, download } from "../../exports/files";
import { Dialog } from "./dialog";
import { EventForm } from "./event-form";
import { Scenario } from "./scenario";
import { Budget } from "./budget";
import { PrintPlan } from "./print-plan";

type Tab = "Overview" | "Budget" | "Timeline" | "Vendors" | "Ideas";
const tabs: { name: Tab; Icon: typeof LayoutDashboard }[] = [
  { name: "Overview", Icon: LayoutDashboard },
  { name: "Budget", Icon: Wallet },
  { name: "Timeline", Icon: CalendarDays },
  { name: "Vendors", Icon: ClipboardList },
  { name: "Ideas", Icon: Lightbulb },
];

export default function Planner() {
  const [events, setEvents] = useState<EventPlan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<
    "create" | "scenario" | "ai" | "chat" | "help" | "delete" | null
  >(null);
  const [initialType, setInitialType] = useState<Brief["type"]>("wedding");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("All");
  const [undo, setUndo] = useState<EventPlan | null>(null);
  const active = events.find((event) => event.id === selected) ?? null;
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const writes = useRef(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadEvents()
      .then((items) => {
        setEvents(items);
        setReady(true);
      })
      .catch(() => {
        setError(
          "Saved events could not be opened. Check browser storage permissions before creating an event.",
        );
        setReady(true);
      });
    return () => requestRef.current?.abort();
  }, []);

  function openCreate(type: Brief["type"] = "wedding") {
    setInitialType(type);
    setModal("create");
  }
  function openEvent(id: string) {
    requestRef.current?.abort();
    setGenerating(false);
    setSelected(id);
    setTab("Overview");
    setUndo(null);
    setError("");
    setSearch("");
  }
  function notify(text: string) {
    setMessage(text);
    setError("");
  }
  async function create(brief: Brief) {
    if (events.length >= 30)
      throw new Error(
        "You can keep up to 30 events. Export and remove one before continuing.",
      );
    const event = createPlan(brief);
    await saveEvent(event);
    setEvents((current) => [event, ...current]);
    openEvent(event.id);
    setModal(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the example.");
    }
  }
  function commit(next: EventPlan, text = "Changes saved") {
    const latest = activeRef.current;
    if (!latest || latest.id !== next.id) return;
    const valid = eventSchema.parse({
      ...next,
      revision: latest.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    activeRef.current = valid;
    setEvents((current) =>
      current.map((event) => (event.id === valid.id ? valid : event)),
    );
    setSaving(true);
    writes.current = writes.current
      .then(() => saveEvent(valid))
      .then(() => {
        setSaving(false);
        notify(text);
      })
      .catch((e) => {
        setSaving(false);
        setError(
          e instanceof Error
            ? e.message
            : "Save failed. Export a backup before leaving.",
        );
      });
  }
  async function generate() {
    const event = activeRef.current;
    if (!event) return;
    setModal(null);
    setGenerating(true);
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.brief),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        draft?: unknown;
      };
      if (!response.ok)
        throw new Error(payload.error || "AI planning is unavailable.");
      const current = activeRef.current;
      if (current?.id !== event.id || current.revision !== event.revision) {
        notify(
          "Your event changed during generation. The AI draft was not applied; try again with your latest plan.",
        );
        return;
      }
      const draft = aiDraftSchema.parse(payload.draft);
      commit(
        applyAiDraft(event, draft),
        "Gemini personalized your tasks, ideas, and event-day schedule.",
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Could not personalize your plan. Your existing plan is safe.",
        );
    } finally {
      if (requestRef.current === controller) {
        setGenerating(false);
        requestRef.current = null;
      }
    }
  }
  function changeVendor(
    id: string,
    patch: Partial<EventPlan["vendors"][number]>,
  ) {
    const current = activeRef.current;
    if (!current) return;
    commit({
      ...current,
      vendors: current.vendors.map((vendor) =>
        vendor.id === id ? { ...vendor, ...patch } : vendor,
      ),
    });
  }
  async function remove() {
    if (!active) return;
    try {
      await writes.current;
      await deleteEvent(active.id);
      setEvents((items) => items.filter((item) => item.id !== active.id));
      setSelected(null);
      setModal(null);
      notify("Event removed from this browser.");
    } catch {
      setError("Could not remove this event. Please try again.");
    }
  }
  const tasks =
    active?.tasks
      .filter(
        (task) =>
          (taskFilter === "All" ||
            (taskFilter === "Done" ? task.done : !task.done)) &&
          task.title.toLowerCase().includes(search.toLowerCase()),
      )
      .slice()
      .sort((a, b) => a.due.localeCompare(b.due)) ?? [];
  function taskRows(limit?: number) {
    return tasks.slice(0, limit).map((task) => (
      <div className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}>
        <label className="task-check">
          <input
            type="checkbox"
            checked={task.done}
            aria-label={`Complete ${task.title}`}
            onChange={() => {
              const current = activeRef.current!;
              if (
                !task.done &&
                task.dependsOn.some(
                  (id) => !current.tasks.find((t) => t.id === id)?.done,
                )
              ) {
                setError("Complete the prerequisite task first.");
                return;
              }
              if (
                task.done &&
                current.tasks.some(
                  (t) => t.done && t.dependsOn.includes(task.id),
                )
              ) {
                setError(
                  "Reopen dependent tasks before reopening this prerequisite.",
                );
                return;
              }
              commit({
                ...current,
                tasks: current.tasks.map((t) =>
                  t.id === task.id ? { ...t, done: !t.done } : t,
                ),
              });
            }}
          />
          <span className="check-box">
            <Check size={13} />
          </span>
        </label>
        <div className="task-description">
          <strong>{task.title}</strong>
          <span>
            {task.category}
            {task.dependsOn.length > 0 ? " · Has prerequisite" : ""}
          </span>
        </div>
        <div
          className={`task-date ${!task.done && task.due < localToday(active!.brief.timezone) ? "late" : ""}`}
        >
          <CalendarDays size={13} />
          {dateLabel(task.due)}
        </div>
        {tab === "Timeline" && (
          <label className="owner-input">
            <span className="sr-only">Owner for {task.title}</span>
            <input
              maxLength={80}
              placeholder="Assign owner"
              defaultValue={task.owner}
              key={`${task.id}-${active!.id}`}
              onBlur={(e) => {
                if (e.target.value !== task.owner) {
                  const current = activeRef.current!;
                  commit({
                    ...current,
                    tasks: current.tasks.map((t) =>
                      t.id === task.id ? { ...t, owner: e.target.value } : t,
                    ),
                  });
                }
              }}
            />
          </label>
        )}
      </div>
    ));
  }

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => {
            setSelected(null);
            setTab("Overview");
          }}
          aria-label="Gather home"
        >
          <span className="brand-symbol">
            <Flower2 size={25} strokeWidth={1.4} />
          </span>
          gather<span className="brand-dot">.</span>
        </button>
        <div className="workspace-label">YOUR PLANNING STUDIO</div>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${!active ? "active" : ""}`}
            onClick={() => setSelected(null)}
          >
            <LayoutDashboard size={18} />
            My events<span className="nav-count">{events.length}</span>
          </button>
          <button
            className="nav-item"
            disabled={!ready}
            onClick={() => openCreate()}
          >
            <Plus size={18} />
            Create an event
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">YOUR EVENTS</div>
        <div className="sidebar-events">
          {events.map((event) => (
            <button
              className={`event-link ${selected === event.id ? "current" : ""}`}
              onClick={() => openEvent(event.id)}
              key={event.id}
            >
              <span className={`event-dot ${event.brief.type}`} />
              <span>{event.brief.title}</span>
            </button>
          ))}
          {ready && !events.length && (
            <p className="sidebar-empty">
              Good things start
              <br />
              with a little planning.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={21} />
            <strong>
              More moments.
              <br />
              Less overwhelm.
            </strong>
            <p>
              A little help for the things
              <br />
              worth bringing people together.
            </p>
          </div>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={17} />
            Help & privacy
          </button>
          <div className="profile">
            <span>Y</span>
            <div>
              Your workspace<small>Saved on this device</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            My workspace
            <ChevronRight size={13} />
            <strong>
              {active
                ? active.brief.type.charAt(0).toUpperCase() +
                  active.brief.type.slice(1)
                : "My events"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="save-indicator">
              <span />
              {saving ? "Saving…" : "Local workspace"}
            </span>
            <button
              className="avatar"
              onClick={() => setModal("help")}
              aria-label="Workspace information"
            >
              Y
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {active && <PrintPlan event={active} />}
          {error && (
            <div className="notice error" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <div className="sr-only" role="status" aria-live="polite">
            {message}
          </div>
          {!ready ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              Opening your workspace…
            </div>
          ) : !active ? (
            <HomeScreen
              events={events}
              openCreate={openCreate}
              explore={explore}
              onImport={() => importRef.current?.click()}
              openEvent={openEvent}
            />
          ) : (
            <>
              <div className="event-heading">
                <div>
                  <div className="inline-actions">
                    <span className={`badge ${active.brief.type}`}>
                      {active.brief.type}
                    </span>
                    <span className="source-label">
                      <span />
                      {active.source === "gemini"
                        ? "Gemini personalized"
                        : "Template plan"}
                    </span>
                  </div>
                  <h1>{active.brief.title}</h1>
                  <div className="event-meta">
                    <span>
                      <CalendarDays size={15} />
                      {dateLabel(active.brief.date)}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {active.brief.location}
                    </span>
                    <span>
                      <Users size={15} />
                      {active.brief.guests} guests
                    </span>
                  </div>
                </div>
                <div className="inline-actions">
                  <button
                    className="button secondary"
                    onClick={() => window.print()}
                  >
                    <Download size={16} />
                    Print plan
                  </button>
                  <div
                    className="ai-actions"
                    role="group"
                    aria-label="AI planning tools"
                  >
                    <button
                      className="button primary"
                      disabled={generating}
                      onClick={() => {
                        setError("");
                        setModal("chat");
                      }}
                    >
                      <MessageCircle size={17} />
                      Chat with Gather
                    </button>
                    <button
                      className="button secondary"
                      disabled={generating}
                      onClick={() => setModal("ai")}
                    >
                      {generating ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}
                      {generating ? "Personalizing…" : "Personalize with AI"}
                    </button>
                  </div>
                </div>
              </div>
              <nav className="event-tabs" aria-label="Event sections">
                {tabs.map(({ name, Icon }) => (
                  <button
                    key={name}
                    aria-current={tab === name ? "page" : undefined}
                    onClick={() => {
                      setTab(name);
                      setSearch("");
                    }}
                  >
                    <Icon size={16} />
                    {name}
                  </button>
                ))}
              </nav>
              {tab === "Overview" && (
                <Overview
                  active={active}
                  taskRows={taskRows}
                  setTab={setTab}
                  setModal={setModal}
                />
              )}
              {tab === "Budget" && (
                <Budget
                  event={active}
                  commit={(update) => {
                    const current = activeRef.current;
                    if (current) commit(update(current));
                  }}
                  onScenario={() => setModal("scenario")}
                  onError={setError}
                />
              )}
              {tab === "Timeline" && (
                <>
                  <div className="section-heading spaced">
                    <div>
                      <h2>A little closer, one task at a time.</h2>
                      <p>
                        Preparation deadlines use {active.brief.timezone}.
                        Complete prerequisites first.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        download(
                          calendarFile(active),
                          "gather-timeline.ics",
                          "text/calendar",
                        )
                      }
                    >
                      <Download size={16} />
                      Calendar
                    </button>
                  </div>
                  <div className="filter-row">
                    <div className="filter-buttons">
                      {["All", "To do", "Done"].map((filter) => (
                        <button
                          key={filter}
                          aria-pressed={taskFilter === filter}
                          onClick={() => setTaskFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <label className="search">
                      <Search size={16} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Find a task…"
                        aria-label="Search tasks"
                      />
                    </label>
                  </div>
                  <section className="panel">
                    {taskRows()}
                    {!tasks.length && (
                      <p className="empty-inline">No tasks match this view.</p>
                    )}
                  </section>
                  <section className="section">
                    <div className="section-heading">
                      <div>
                        <h2>On the day</h2>
                        <p>
                          A suggested run of show, in local event time. Confirm
                          timings with your team.
                        </p>
                      </div>
                    </div>
                    <div className="run-of-show">
                      {active.runOfShow.map((item, i) => (
                        <div key={i}>
                          <time>{item.time}</time>
                          <span />
                          <strong>{item.title}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {tab === "Vendors" && (
                <Vendors
                  active={active}
                  changeVendor={changeVendor}
                  setError={setError}
                />
              )}
              {tab === "Ideas" && <Ideas active={active} />}
              <section className="assumptions">
                <h3>
                  <CircleHelp size={16} />A few things to keep in mind
                </h3>
                <ul>
                  {active.assumptions.map((assumption, i) => (
                    <li key={i}>{assumption}</li>
                  ))}
                </ul>
              </section>
              <div className="event-footer">
                <span>Made for your moments. Saved in your browser.</span>
                <button
                  className="text-button danger"
                  onClick={() => setModal("delete")}
                >
                  <Trash2 size={14} />
                  Delete event
                </button>
              </div>
              {undo?.id === active.id &&
                active.revision === undo.revision + 1 && (
                  <div className="undo-bar">
                    <CheckCheck size={17} />
                    <span>
                      Scenario applied. Your previous version is available.
                    </span>
                    <button
                      onClick={() => {
                        commit(undo, "Previous version restored.");
                        setUndo(null);
                      }}
                    >
                      <RotateCcw size={15} />
                      Undo
                    </button>
                  </div>
                )}
            </>
          )}
          <footer className="site-footer">
            <span>
              <Flower2 size={15} />
              gather.
            </span>
            <span>Thoughtfully planned. Happily together.</span>
            <button onClick={() => setModal("help")}>Privacy & help</button>
          </footer>
        </main>
      </div>
      <input
        className="sr-only"
        type="file"
        ref={importRef}
        accept="application/json,.json"
        aria-label="Import event backup"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > MAX_BACKUP_BYTES)
              throw new Error("Backup must be smaller than 32 MB.");
            const imported = await importEvents(await file.text());
            setEvents(imported);
            notify("Backup imported as separate events.");
          } catch (err) {
            setError(
              err instanceof Error && !("issues" in err)
                ? err.message
                : "This is not a valid Gather backup. Existing events are safe.",
            );
          }
          e.target.value = "";
        }}
      />
      {modal === "chat" && active && (
        <Dialog
          title="Your ideas. A little guidance."
          wide
          onClose={() => setModal(null)}
        >
          <Chat
            key={active.id}
            event={active}
            getCurrent={() => activeRef.current}
            onUpdate={commit}
            onPersonalize={() => setModal("ai")}
            storageError={error}
          />
        </Dialog>
      )}
      {modal === "create" && (
        <Dialog
          title="Let’s plan a lovely gathering."
          onClose={() => setModal(null)}
        >
          <EventForm initialType={initialType} onCreate={create} />
        </Dialog>
      )}
      {modal === "scenario" && active && (
        <Dialog
          title="What if we changed the plan?"
          onClose={() => setModal(null)}
        >
          <Scenario
            event={active}
            onApply={(next) => {
              if (activeRef.current?.revision !== next.revision - 1) {
                setError(
                  "Your plan changed while this preview was open. Compare the scenario again using the latest version.",
                );
                setModal(null);
                return;
              }
              setUndo(active);
              commit(
                next,
                "Scenario applied. Protected categories and payments were preserved.",
              );
              setModal(null);
            }}
          />
        </Dialog>
      )}
      {modal === "ai" && active && (
        <Dialog title="A more personal plan." onClose={() => setModal(null)}>
          <div className="dialog-copy">
            <span className="ai-orb">
              <Sparkles size={28} />
            </span>
            <p>
              Gemini will use your event details and preferences to personalize
              tasks, ideas, and the event-day schedule. Budget amounts, vendor
              records, and completed tasks stay in place.
            </p>
            <p>
              Your brief is sent to Google’s Gemini API. Google’s free tier may
              use content to improve its products. Avoid including private or
              sensitive information.
            </p>
            <p className="small muted">
              If the API is unavailable, your existing plan remains usable.
              Changing the event while generation runs prevents an outdated
              draft from being applied.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Keep current plan
              </button>
              <button className="button primary" onClick={generate}>
                <Sparkles size={16} />
                Personalize my plan
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {modal === "delete" && active && (
        <Dialog title="Remove this event?" onClose={() => setModal(null)}>
          <div className="dialog-copy">
            <p>
              This removes “{active.brief.title}” from this browser. Download a
              backup first if you might need it later.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Keep event
              </button>
              <button className="button destructive" onClick={remove}>
                Delete event
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="A little help, and your privacy."
          onClose={() => setModal(null)}
        >
          <div className="dialog-copy">
            <h3>Make a plan, then make it yours</h3>
            <p>
              Create a wedding, birthday, or community event. Edit budget
              amounts, complete tasks, track vendors, and download your plan.
              Lock budget categories before comparing scenarios.
            </p>
            <h3>Your data stays close</h3>
            <p>
              Plans are saved in this browser using IndexedDB. They do not sync
              across devices and may be lost if browser storage is cleared.
              Download JSON backups regularly. Imports create separate copies.
            </p>
            <h3>AI is optional</h3>
            <p>
              Personalizing a plan or sending a chat message shares your event
              brief with Google Gemini. Chat also shares recent messages and a
              summary of tasks, allocations, and vendor categories. Vendor
              names, quotes, payments, and task owners are excluded from event
              context. Template plans are labeled clearly. Gemini suggestions
              and allocations are estimates; verify vendors and local
              requirements yourself.
            </p>
            <h3>Free-tier limits</h3>
            <p>
              The server accepts up to four AI requests per minute across the
              workspace. Google applies additional project limits. Your plan
              stays editable during outages.
            </p>
            <a
              className="text-button"
              href="https://ai.google.dev/gemini-api/docs/pricing"
              target="_blank"
              rel="noreferrer"
            >
              Google Gemini data and pricing details
              <ArrowRight size={14} />
            </a>
            <button
              className="button primary full"
              onClick={() => setModal(null)}
            >
              Back to planning
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
