import type { EventPlan, Task } from "./schema";

/** Task dependency rules are shared by every view that changes completion. */
export function toggleTask(plan: EventPlan, id: string): EventPlan {
  const task = plan.tasks.find((item) => item.id === id);
  if (!task) throw new Error("This task is no longer in your plan.");
  if (
    !task.done &&
    task.dependsOn.some(
      (dependency) => !plan.tasks.find((item) => item.id === dependency)?.done,
    )
  )
    throw new Error("Complete the prerequisite task first.");
  if (
    task.done &&
    plan.tasks.some((item) => item.done && item.dependsOn.includes(id))
  )
    throw new Error(
      "Reopen dependent tasks before reopening this prerequisite.",
    );
  return {
    ...plan,
    tasks: plan.tasks.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    ),
  };
}
export function assignOwner(
  plan: EventPlan,
  id: string,
  owner: string,
): EventPlan {
  return {
    ...plan,
    tasks: plan.tasks.map((task) =>
      task.id === id ? { ...task, owner } : task,
    ),
  };
}
export type TaskFilter = "All" | "To do" | "Done";
export function visibleTasks(
  tasks: Task[],
  filter: TaskFilter,
  search: string,
): Task[] {
  const query = search.toLowerCase();
  return tasks
    .filter(
      (task) =>
        (filter === "All" || (filter === "Done" ? task.done : !task.done)) &&
        task.title.toLowerCase().includes(query),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
}
