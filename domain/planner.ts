import { allocate } from "./money";
import { dayDistance, localToday, preparationDate, shiftDate } from "./dates";
import {
  briefSchema,
  eventSchema,
  type AiDraft,
  type Brief,
  type EventPlan,
} from "./schema";

import { templates } from "./templates";

export function createPlan(
  input: Brief,
  today = localToday(input.timezone),
  id = crypto.randomUUID(),
): EventPlan {
  const brief = briefSchema.parse(input);
  if (brief.date < today)
    throw new Error("Choose today or a future event date.");
  const template = templates[brief.type];
  const amounts = allocate(brief.budget, [...template.weights]);
  const urgent = template.tasks.some(
    ([, days]) => shiftDate(brief.date, -days) < today,
  );
  const tasks = template.tasks.map(([title, days, category], i) => ({
    id: `task-${i}`,
    title,
    category,
    due:
      shiftDate(brief.date, -days) < today
        ? today
        : shiftDate(brief.date, -days),
    done: false,
    owner: "",
    dependsOn: i === 1 ? ["task-0"] : [],
  }));
  return eventSchema.parse({
    id,
    revision: 0,
    brief,
    budget: template.categories.map((name, i) => ({
      id: `budget-${i}`,
      name,
      amount: amounts[i],
      paid: 0,
      locked: false,
    })),
    tasks,
    vendors: template.vendors.map((category, i) => ({
      id: `vendor-${i}`,
      category,
      name: "",
      status: "To research",
      quote: 0,
      questions: [
        "What is included in the quote, including taxes?",
        "What are the deposit and cancellation terms?",
        "Can you meet our access and dietary requirements?",
      ],
    })),
    ideas: template.ideas.map(([title, description, cost]) => ({
      title,
      description,
      cost,
    })),
    runOfShow: template.run.map(([time, title]) => ({ time, title })),
    assumptions: [
      "Budget allocations are planning targets, not verified local vendor prices. Request quotes before committing.",
      "Event-day times are a suggested starting point; confirm them with your venue and vendors.",
      ...(brief.preferences
        ? [
            "Your preferences are saved. Template ideas are general; use Gemini to personalize them.",
          ]
        : []),
      ...(urgent
        ? [
            "Short lead time: some usual preparation windows have passed. Tasks are moved to today; confirm vendor availability immediately.",
          ]
        : []),
    ],
    source: "template",
    updatedAt: new Date().toISOString(),
  });
}

export function applyAiDraft(
  plan: EventPlan,
  draft: AiDraft,
  today = localToday(plan.brief.timezone),
): EventPlan {
  const generated = draft.tasks.map((task, i) => ({
    id: `ai-${plan.revision + 1}-${i}`,
    title: task.title,
    category: task.category,
    due: preparationDate(plan.brief.date, task.daysBefore, today),
    done: false,
    owner: "",
    dependsOn: [],
  }));
  return eventSchema.parse({
    ...plan,
    revision: plan.revision + 1,
    source: "gemini",
    updatedAt: new Date().toISOString(),
    tasks: [...plan.tasks.filter((task) => task.done), ...generated],
    ideas: draft.ideas,
    assumptions: [...plan.assumptions.slice(0, 2), ...draft.assumptions],
    runOfShow: draft.runOfShow,
  });
}

export function scenario(
  plan: EventPlan,
  budget: number,
  guests: number,
): EventPlan {
  briefSchema.parse({ ...plan.brief, budget, guests });
  const locked = plan.budget.filter((line) => line.locked);
  const fixed = locked.reduce(
    (sum, line) => sum + Math.max(line.amount, line.paid),
    0,
  );
  const flexible = plan.budget.filter((line) => !line.locked);
  const paid = flexible.reduce((sum, line) => sum + line.paid, 0);
  if (fixed + paid > budget)
    throw new Error(
      "This budget cannot cover protected allocations and recorded payments. Increase it or review your locks.",
    );
  if (!flexible.length && fixed !== budget)
    throw new Error("Unlock a category to redistribute this budget.");
  const weights = flexible.map((line) => Math.max(line.amount - line.paid, 1));
  const amounts = flexible.length
    ? allocate(budget - fixed - paid, weights)
    : [];
  return eventSchema.parse({
    ...plan,
    revision: plan.revision + 1,
    brief: { ...plan.brief, budget, guests },
    budget: plan.budget.map((line) =>
      line.locked
        ? { ...line, amount: Math.max(line.amount, line.paid) }
        : {
            ...line,
            amount:
              line.paid +
              amounts[flexible.findIndex((item) => item.id === line.id)],
          },
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function planStats(
  plan: EventPlan,
  today = localToday(plan.brief.timezone),
) {
  const allocated = plan.budget.reduce((sum, line) => sum + line.amount, 0);
  const paid = plan.budget.reduce((sum, line) => sum + line.paid, 0);
  const completed = plan.tasks.filter((task) => task.done).length;
  return {
    allocated,
    paid,
    remaining: plan.brief.budget - allocated,
    completed,
    progress: Math.round((completed / plan.tasks.length) * 100),
    days: dayDistance(today, plan.brief.date),
    overdue: plan.tasks.filter((task) => !task.done && task.due < today).length,
  };
}
