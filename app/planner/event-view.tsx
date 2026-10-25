"use client";
import { useState } from "react";
import { CheckCheck, CircleHelp, RotateCcw, Trash2 } from "lucide-react";
import type { EventPlan } from "../../domain/schema";
import { visibleTasks, type TaskFilter } from "../../domain/tasks";
import type { useEventWorkspace } from "./use-event-workspace";
import type { PlannerModal } from "./planner-dialogs";
import { EventHeader, EventTabs, type PlannerTab } from "./event-header";
import { Overview } from "./overview";
import { Budget } from "./budget";
import { Timeline } from "./timeline";
import { TaskList } from "./task-list";
import { Vendors } from "./vendors";
import { Ideas } from "./ideas";
type Props = {
  event: EventPlan;
  actions: Pick<
    ReturnType<typeof useEventWorkspace>,
    "update" | "commit" | "setError"
  >;
  generating: boolean;
  readOnly: boolean;
  onModal: (modal: PlannerModal) => void;
  undo: EventPlan | null;
  onUndoCleared: () => void;
};
export function EventView({
  event,
  actions,
  generating,
  readOnly,
  onModal,
  undo,
  onUndoCleared,
}: Props) {
  const [tab, setTab] = useState<PlannerTab>("Overview");
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("All");
  const { commit, setError } = actions;
  const tasks = visibleTasks(event.tasks, taskFilter, search);
  function changeVendor(
    id: string,
    patch: Partial<EventPlan["vendors"][number]>,
  ) {
    actions.update((plan) => ({
      ...plan,
      vendors: plan.vendors.map((vendor) =>
        vendor.id === id ? { ...vendor, ...patch } : vendor,
      ),
    }));
  }
  function taskRows(limit?: number) {
    return (
      <TaskList
        tasks={tasks.slice(0, limit)}
        timezone={event.brief.timezone}
        showOwners={tab === "Timeline"}
        onUpdate={actions.update}
        onError={setError}
        readOnly={readOnly}
      />
    );
  }
  return (
    <>
      <EventHeader
        active={event}
        generating={generating}
        readOnly={readOnly}
        onChat={() => {
          setError("");
          onModal("chat");
        }}
        onPersonalize={() => onModal("ai")}
      />
      <EventTabs
        tab={tab}
        onTab={(value) => {
          setTab(value);
          setSearch("");
        }}
      />
      {tab === "Overview" && (
        <Overview
          active={event}
          taskRows={taskRows}
          setTab={setTab}
          setModal={onModal}
          readOnly={readOnly}
        />
      )}
      {tab === "Budget" && (
        <Budget
          event={event}
          commit={actions.update}
          onScenario={() => onModal("scenario")}
          onError={setError}
          readOnly={readOnly}
        />
      )}
      {tab === "Timeline" && (
        <Timeline
          active={event}
          search={search}
          onSearch={setSearch}
          taskFilter={taskFilter}
          onFilter={setTaskFilter}
          hasTasks={tasks.length > 0}
        >
          {taskRows()}
        </Timeline>
      )}
      {tab === "Vendors" && (
        <Vendors
          active={event}
          changeVendor={changeVendor}
          readOnly={readOnly}
          setError={setError}
        />
      )}
      {tab === "Ideas" && <Ideas active={event} />}
      <section className="assumptions">
        <h3>
          <CircleHelp size={16} />A few things to keep in mind
        </h3>
        <ul>
          {event.assumptions.map((assumption, i) => (
            <li key={i}>{assumption}</li>
          ))}
        </ul>
      </section>
      <div className="event-footer">
        <span>Made for your moments. Saved in your browser.</span>
        <button
          className="text-button danger"
          disabled={readOnly}
          onClick={() => onModal("delete")}
        >
          <Trash2 size={14} />
          Delete event
        </button>
      </div>
      {undo?.id === event.id && event.revision === undo.revision + 1 && (
        <div className="undo-bar">
          <CheckCheck size={17} />
          <span>Scenario applied. Your previous version is available.</span>
          <button
            disabled={readOnly}
            onClick={() => {
              commit(undo, "Previous version restored.");
              onUndoCleared();
            }}
          >
            <RotateCcw size={15} />
            Undo
          </button>
        </div>
      )}
    </>
  );
}
