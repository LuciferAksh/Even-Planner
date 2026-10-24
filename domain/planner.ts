import { allocate } from "./money";
import { dayDistance, localToday, shiftDate } from "./dates";
import {
  briefSchema,
  eventSchema,
  type AiDraft,
  type Brief,
  type EventPlan,
} from "./schema";

const templates = {
  wedding: {
    categories: [
      "Venue & rentals",
      "Food & beverages",
      "Decor & flowers",
      "Photography",
      "Music & moments",
      "Contingency",
    ],
    weights: [28, 32, 12, 10, 8, 10],
    tasks: [
      ["Set priorities and confirm the guest list", 90, "Planning"],
      ["Compare venues and check accessibility", 75, "Venue"],
      ["Request catering quotes and dietary options", 60, "Food"],
      ["Confirm photography and music", 45, "Vendors"],
      ["Send invitations and request dietary needs", 40, "Guests"],
      ["Plan ceremony and reception timings", 30, "Schedule"],
      ["Confirm transport, seating and rain backup", 14, "Logistics"],
      ["Review vendor balances and final guest count", 7, "Budget"],
      ["Share the run of show with vendors", 2, "Schedule"],
      ["Check venue setup and emergency contacts", 0, "Event day"],
    ],
    vendors: [
      "Venue & rentals",
      "Catering",
      "Florist & decor",
      "Photographer",
      "Music & sound",
    ],
    ideas: [
      [
        "A welcome with a story",
        "Create a small welcome table with photos and a handwritten note about your story. Add it to the setup checklist.",
        "Low",
      ],
      [
        "A seasonal menu",
        "Ask your caterer for locally available seasonal dishes and clearly labeled dietary options. Compare the quote before booking.",
        "Low",
      ],
      [
        "Messages for the years ahead",
        "Invite guests to write anniversary notes on paper cards. Assign someone to collect them before cleanup.",
        "Low",
      ],
    ],
    run: [
      ["15:00", "Venue setup and vendor check-in"],
      ["16:30", "Guest arrival and welcome"],
      ["17:00", "Ceremony"],
      ["18:30", "Dinner and toasts"],
      ["21:00", "Farewell and cleanup"],
    ],
  },
  birthday: {
    categories: [
      "Venue & rentals",
      "Food & cake",
      "Decorations",
      "Activities",
      "Invitations & favors",
      "Contingency",
    ],
    weights: [20, 30, 12, 20, 8, 10],
    tasks: [
      ["Choose a theme and age-appropriate activities", 30, "Planning"],
      ["Confirm guests, location and accessibility", 25, "Venue"],
      ["Arrange cake and check food allergies", 20, "Food"],
      ["Send invitations and collect RSVPs", 18, "Guests"],
      ["Plan activities and supervision if needed", 14, "Activities"],
      ["Arrange decorations and supplies", 10, "Decor"],
      ["Confirm final numbers and food quantities", 5, "Food"],
      ["Prepare music and activity materials", 2, "Activities"],
      ["Set up the space and review safety", 0, "Event day"],
    ],
    vendors: [
      "Venue & rentals",
      "Cake & catering",
      "Activities & entertainment",
      "Decorations",
    ],
    ideas: [
      [
        "A memory-making station",
        "Set out simple art supplies or a shared guestbook. Match the activity to the age group and assign a helper.",
        "Low",
      ],
      [
        "The favorite-things playlist",
        "Invite guests to suggest a song before the celebration. Prepare a playlist and check the speaker setup.",
        "Free",
      ],
      [
        "A thoughtful cake moment",
        "Plan a short toast and cake moment around the guest of honor. Confirm ingredients and dietary alternatives.",
        "Low",
      ],
    ],
    run: [
      ["15:00", "Setup and food check"],
      ["16:00", "Welcome guests"],
      ["16:30", "Activities and games"],
      ["17:30", "Cake and birthday wishes"],
      ["18:00", "Food and conversation"],
      ["19:00", "Farewell and cleanup"],
    ],
  },
  community: {
    categories: [
      "Space & equipment",
      "Refreshments",
      "Activities & materials",
      "Access & safety",
      "Outreach",
      "Contingency",
    ],
    weights: [25, 20, 20, 15, 10, 10],
    tasks: [
      ["Define the purpose, capacity and organizing team", 45, "Planning"],
      ["Check venue access and applicable permissions", 35, "Venue"],
      ["Recruit volunteers and assign responsibilities", 28, "People"],
      ["Plan registration, crowd flow and safety", 21, "Safety"],
      ["Share an invitation with accessibility details", 18, "Outreach"],
      ["Arrange equipment and activity materials", 14, "Logistics"],
      ["Confirm refreshments and dietary options", 10, "Food"],
      ["Prepare weather backup and cleanup plan", 7, "Safety"],
      ["Brief volunteers and confirm emergency contacts", 2, "People"],
      ["Check access routes and registration desk", 0, "Event day"],
    ],
    vendors: [
      "Space & equipment",
      "Refreshments",
      "Sound & lighting",
      "Sanitation & cleanup",
    ],
    ideas: [
      [
        "A community skill exchange",
        "Invite volunteers to lead short demonstrations. Publish a simple schedule and ensure activities are accessible.",
        "Free",
      ],
      [
        "A welcoming first five minutes",
        "Assign greeters, add clear signs, and offer a quiet seating area. Include access information in invitations.",
        "Low",
      ],
      [
        "Bring and share responsibly",
        "Consider a labeled refreshments table with ingredient information. Assign a volunteer to manage it and check venue rules.",
        "Low",
      ],
    ],
    run: [
      ["09:00", "Volunteer briefing and access check"],
      ["10:00", "Registration and welcome"],
      ["10:30", "Community activities"],
      ["12:00", "Refreshments and conversations"],
      ["13:00", "Closing thanks"],
      ["13:30", "Cleanup and equipment return"],
    ],
  },
} as const;

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
    due: [today, shiftDate(plan.brief.date, -task.daysBefore)].sort().at(-1)!,
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
