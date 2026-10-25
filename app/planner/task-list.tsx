"use client";
import { CalendarDays, Check } from "lucide-react";
import { dateLabel, localToday } from "../../domain/dates";
import type { EventPlan, Task } from "../../domain/schema";
import { assignOwner, toggleTask } from "../../domain/tasks";
import type { PlanUpdate } from "./use-event-workspace";

export function TaskList({
  tasks,
  timezone,
  showOwners = false,
  onUpdate,
  onError,
  readOnly = false,
}: {
  tasks: Task[];
  timezone: string;
  showOwners?: boolean;
  onUpdate: (update: PlanUpdate) => void;
  onError: (message: string) => void;
  readOnly?: boolean;
}) {
  function complete(id: string) {
    try {
      onUpdate((plan: EventPlan) => toggleTask(plan, id));
    } catch (cause) {
      onError(
        cause instanceof Error ? cause.message : "Could not update this task.",
      );
    }
  }
  return tasks.map((task) => (
    <div className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}>
      <label className="task-check">
        <input
          type="checkbox"
          disabled={readOnly}
          checked={task.done}
          aria-label={`Complete ${task.title}`}
          onChange={() => complete(task.id)}
        />
        <span className="check-box" aria-hidden="true">
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
        className={`task-date ${!task.done && task.due < localToday(timezone) ? "late" : ""}`}
      >
        <CalendarDays size={13} />
        {dateLabel(task.due)}
      </div>
      {showOwners && (
        <label className="owner-input">
          <span className="sr-only">Owner for {task.title}</span>
          <input
            maxLength={80}
            disabled={readOnly}
            placeholder="Assign owner"
            defaultValue={task.owner}
            key={task.id}
            onBlur={(event) => {
              const value = event.target.value;
              if (value !== task.owner)
                onUpdate((plan) => assignOwner(plan, task.id, value));
            }}
          />
        </label>
      )}
    </div>
  ));
}
