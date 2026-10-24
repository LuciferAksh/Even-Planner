import { describe, expect, it } from "vitest";
import { createPlan } from "../../domain/planner";
import { assignOwner, toggleTask, visibleTasks } from "../../domain/tasks";
import { responseError, responseField } from "../../lib/ai-response";
import { brief } from "./fixtures";

describe("shared task rules", () => {
  const plan = () => createPlan(brief, "2026-10-24");
  it("requires prerequisites and refuses to reopen a completed dependency", () => {
    const event = plan();
    expect(() => toggleTask(event, event.tasks[1].id)).toThrow("prerequisite");
    const completed = toggleTask(
      toggleTask(event, event.tasks[0].id),
      event.tasks[1].id,
    );
    expect(() => toggleTask(completed, event.tasks[0].id)).toThrow("dependent");
    const reopened = toggleTask(
      toggleTask(completed, event.tasks[1].id),
      event.tasks[0].id,
    );
    expect(reopened.tasks.slice(0, 2).every((task) => !task.done)).toBe(true);
    expect(event.tasks.every((task) => !task.done)).toBe(true);
  });
  it("rejects a task removed from the plan and missing prerequisites", () => {
    const event = plan();
    expect(() => toggleTask(event, "missing")).toThrow("no longer");
    event.tasks[0].dependsOn = ["missing"];
    expect(() => toggleTask(event, event.tasks[0].id)).toThrow("prerequisite");
  });
  it("assigns owners without altering other task fields or the source", () => {
    const event = plan();
    const updated = assignOwner(event, event.tasks[0].id, "Event coordinator");
    expect(updated.tasks[0]).toEqual({
      ...event.tasks[0],
      owner: "Event coordinator",
    });
    expect(updated.tasks[1]).toEqual(event.tasks[1]);
    expect(event.tasks[0].owner).toBe("");
  });
  it("combines status and case-insensitive search while keeping chronological order", () => {
    const event = toggleTask(plan(), "task-0");
    expect(
      visibleTasks(event.tasks, "Done", "PRIORITIES").map((task) => task.id),
    ).toEqual(["task-0"]);
    expect(visibleTasks(event.tasks, "To do", "PRIORITIES")).toEqual([]);
    expect(visibleTasks(event.tasks, "All", "no such task")).toEqual([]);
    const original = [...event.tasks];
    const ordered = visibleTasks([...event.tasks].reverse(), "All", "");
    expect(ordered.map((task) => task.due)).toEqual(
      ordered.map((task) => task.due).sort(),
    );
    expect(event.tasks).toEqual(original);
  });
});

describe("untrusted client response boundaries", () => {
  it("narrows response fields and handles primitive or missing data", () => {
    expect(responseField({ draft: { tasks: [] } }, "draft")).toEqual({
      tasks: [],
    });
    for (const value of [null, undefined, "text", 42, {}, []])
      expect(responseField(value, "draft")).toBeUndefined();
  });
  it("uses safe errors without presenting structured validation internals", () => {
    expect(responseError({ error: "Quota busy" }, "Fallback")).toBe(
      "Quota busy",
    );
    expect(responseError({ error: { private: true } }, "Fallback")).toBe(
      "Fallback",
    );
    expect(responseError(new Error("Unavailable"), "Fallback")).toBe(
      "Unavailable",
    );
    expect(
      responseError(
        Object.assign(new Error("Internal schema details"), { issues: [] }),
        "Fallback",
      ),
    ).toBe("Fallback");
  });
});
