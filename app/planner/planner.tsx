"use client";
import { useRef, useState } from "react";
import { Flower2, LoaderCircle, X } from "lucide-react";
import type { Brief, EventPlan } from "../../domain/schema";
import { HomeScreen } from "./home";
import { EventView } from "./event-view";
import { PrintPlan } from "./print-plan";
import { Sidebar, Topbar } from "./workspace-navigation";
import { PlannerDialogs, type PlannerModal } from "./planner-dialogs";
import { useEventWorkspace } from "./use-event-workspace";
import { usePersonalization } from "./use-personalization";
import { backupJson, download } from "../../exports/files";

export default function Planner() {
  const workspace = useEventWorkspace();
  const {
    events,
    active,
    ready,
    saving,
    error,
    message,
    readOnly,
    setError,
    commit,
  } = workspace;
  const ai = usePersonalization({
    getCurrent: workspace.getCurrent,
    onUpdate: commit,
    onNotice: workspace.notify,
    onError: setError,
  });
  const [modal, setModal] = useState<PlannerModal>(null);
  const [initialType, setInitialType] = useState<Brief["type"]>("wedding");
  const [undo, setUndo] = useState<EventPlan | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  function openCreate(type: Brief["type"] = "wedding") {
    setInitialType(type);
    setModal("create");
  }
  function openEvent(id: string) {
    ai.cancel();
    workspace.openEvent(id);
    setViewRevision((revision) => revision + 1);
    setUndo(null);
  }
  function goHome() {
    ai.cancel();
    workspace.goHome();
  }
  async function create(brief: Brief) {
    ai.cancel();
    await workspace.create(brief);
    setUndo(null);
    setModal(null);
  }
  async function remove() {
    try {
      await workspace.remove();
      setModal(null);
    } catch {
      setError("Could not remove this event. Please try again.");
    }
  }
  function applyScenario(next: EventPlan) {
    if (workspace.getCurrent()?.revision !== next.revision - 1) {
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
  }
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar
        events={events}
        active={active}
        ready={ready}
        onHome={goHome}
        onCreate={() => openCreate()}
        onHelp={() => setModal("help")}
        onOpen={openEvent}
      />
      <div className="main-shell">
        <Topbar
          active={active}
          saving={saving}
          onHelp={() => setModal("help")}
        />
        <main id="main" tabIndex={-1}>
          {active && <PrintPlan event={active} />}
          {error && (
            <div
              className={`notice error ${readOnly ? "save-conflict" : ""}`}
              role="alert"
            >
              <span>{error}</span>
              {readOnly ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        backupJson(events),
                        "gather-unsaved-backup.json",
                        "application/json",
                      )
                    }
                  >
                    Back up unsaved copy
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => window.location.reload()}
                  >
                    Reload saved events
                  </button>
                </>
              ) : (
                <button
                  className="icon-button"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                >
                  <X size={17} />
                </button>
              )}
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
              explore={workspace.explore}
              onImport={() => importRef.current?.click()}
              openEvent={openEvent}
            />
          ) : (
            <>
              <EventView
                key={`${active.id}-${viewRevision}`}
                event={active}
                actions={workspace}
                generating={ai.generating}
                readOnly={readOnly}
                onModal={setModal}
                undo={undo}
                onUndoCleared={() => setUndo(null)}
              />
            </>
          )}
          <footer className="site-footer">
            <span>
              <Flower2 size={15} />
              gather.
            </span>
            <span>Thoughtfully planned. Happily together.</span>
            <button onClick={() => setModal("help")}>Privacy &amp; help</button>
          </footer>
        </main>
      </div>
      <input
        className="sr-only"
        type="file"
        ref={importRef}
        accept="application/json,.json"
        aria-label="Import event backup"
        disabled={!ready}
        onChange={async (e) => {
          const input = e.currentTarget,
            file = input.files?.[0];
          if (!file) return;
          try {
            await workspace.importBackup(file);
          } catch (cause) {
            setError(
              cause instanceof Error && !("issues" in cause)
                ? cause.message
                : "This is not a valid Gather backup. Existing events are safe.",
            );
          }
          input.value = "";
        }}
      />
      <PlannerDialogs
        modal={modal}
        active={active}
        initialType={initialType}
        error={error}
        readOnly={readOnly}
        getCurrent={workspace.getCurrent}
        onUpdate={commit}
        onClose={() => setModal(null)}
        onPersonalize={() => setModal("ai")}
        onCreate={create}
        onScenario={applyScenario}
        onGenerate={() => {
          setModal(null);
          void ai.generate();
        }}
        onRemove={() => void remove()}
      />
    </div>
  );
}
