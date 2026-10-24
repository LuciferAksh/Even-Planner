import { describe, expect, it } from "vitest";
import { allocate, money, parseMoney } from "../../domain/money";
import {
  dateLabel,
  dayDistance,
  localToday,
  shiftDate,
} from "../../domain/dates";
import {
  applyAiDraft,
  createPlan,
  planStats,
  scenario,
} from "../../domain/planner";
import { aiDraftSchema, briefSchema, eventSchema } from "../../domain/schema";
import { brief, draft } from "./fixtures";

describe("currency math", () => {
  it("preserves every minor unit over diverse budgets and weights", () => {
    for (let total = 0; total < 300; total++)
      for (const weights of [
        [1, 1, 1],
        [28, 32, 12, 10, 8, 10],
        [0, 10, 7],
      ]) {
        const parts = allocate(total, weights);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts.every((n) => Number.isSafeInteger(n) && n >= 0)).toBe(
          true,
        );
      }
    expect(allocate(10000000000, [30, 70])).toEqual([3000000000, 7000000000]);
  });
  it("rejects invalid allocations", () => {
    for (const [total, weights] of [
      [-1, [1]],
      [1, []],
      [1, [0]],
      [1, [-1]],
      [1.1, [1]],
    ] as [number, number[]][])
      expect(() => allocate(total, weights)).toThrow();
  });
  it("parses decimals without floating point rounding", () => {
    expect(parseMoney("0.29")).toBe(29);
    expect(parseMoney("123.4")).toBe(12340);
    expect(parseMoney("0")).toBe(0);
    for (const value of ["-1", "1.001", "1e3", "=1+1", "", "NaN"])
      expect(() => parseMoney(value)).toThrow();
    expect(money(12345, "USD")).toContain("123.45");
    expect(money(0)).toContain("0");
  });
});
describe("calendar logic", () => {
  it("handles leap days, year boundaries and event timezone", () => {
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayDistance("2027-01-01", "2027-01-03")).toBe(2);
    expect(localToday("Asia/Kolkata", new Date("2026-10-24T22:00:00Z"))).toBe(
      "2026-10-25",
    );
    expect(dateLabel("2027-02-20")).toContain("2027");
  });
  it("rejects impossible dates and invalid inputs", () => {
    for (const input of [
      { date: "2027-02-29" },
      { guests: 0 },
      { guests: 1.5 },
      { timezone: "Atlantis" },
      { budget: -1 },
    ])
      expect(briefSchema.safeParse({ ...brief, ...input }).success).toBe(false);
  });
});
describe("event plans", () => {
  it.each(["wedding", "birthday", "community"] as const)(
    "makes a complete %s with exact budget",
    (type) => {
      const plan = createPlan({ ...brief, type }, "2026-10-24");
      expect(eventSchema.safeParse(plan).success).toBe(true);
      expect(planStats(plan).allocated).toBe(brief.budget);
      expect(plan.tasks.length).toBeGreaterThan(5);
      expect(plan.ideas.length).toBe(3);
      expect(plan.vendors.length).toBeGreaterThan(2);
    },
  );
  it("handles zero budgets and urgent events explicitly", () => {
    const plan = createPlan(
      { ...brief, budget: 0, date: "2026-10-24" },
      "2026-10-24",
    );
    expect(plan.budget.every((line) => line.amount === 0)).toBe(true);
    expect(plan.tasks.every((task) => task.due === "2026-10-24")).toBe(true);
    expect(plan.assumptions.join(" ")).toContain("Short lead time");
    expect(() =>
      createPlan({ ...brief, date: "2026-10-23" }, "2026-10-24"),
    ).toThrow();
  });
  it("retains preferences without claiming template personalization", () => {
    const plan = createPlan(brief, "2026-10-24");
    expect(plan.source).toBe("template");
    expect(plan.assumptions.join(" ")).toContain("general");
    const noPreferences = createPlan(
      { ...brief, preferences: "" },
      "2026-10-24",
    );
    expect(noPreferences.assumptions.length).toBeLessThan(
      plan.assumptions.length,
    );
  });
  it("preserves locked costs, payments, vendors and tasks through scenarios", () => {
    const plan = createPlan(brief, "2026-10-24");
    plan.budget[0].locked = true;
    plan.budget[1].paid = 100;
    plan.tasks[0].done = true;
    plan.vendors[0].status = "Booked";
    const next = scenario(plan, 50000000, 100);
    expect(next.budget[0]).toEqual(plan.budget[0]);
    expect(next.budget[1].amount).toBeGreaterThanOrEqual(100);
    expect(next.tasks).toEqual(plan.tasks);
    expect(next.vendors).toEqual(plan.vendors);
    expect(planStats(next).allocated).toBe(50000000);
    expect(next.brief.guests).toBe(100);
    expect(() => scenario(plan, 1, 100)).toThrow();
  });
  it("rejects impossible fully locked scenarios and permits unchanged locked totals", () => {
    const plan = createPlan(brief, "2026-10-24");
    plan.budget.forEach((line) => {
      line.locked = true;
    });
    expect(() => scenario(plan, brief.budget + 1, 100)).toThrow();
    expect(scenario(plan, brief.budget, 100).budget).toEqual(plan.budget);
  });
  it("protects payments greater than original allocations", () => {
    const plan = createPlan(brief, "2026-10-24");
    plan.budget[0].locked = true;
    plan.budget[0].paid = 30000000;
    expect(scenario(plan, 60000000, 100).budget[0].amount).toBe(30000000);
    plan.budget[1].paid = 70000000;
    expect(planStats(plan).paid).toBe(100000000);
    expect(() => scenario(plan, 60000000, 100)).toThrow();
  });
  it("personalizes safely and retains completed tasks on repeated AI updates", () => {
    const plan = createPlan(brief, "2026-10-24");
    plan.tasks[0].done = true;
    const next = applyAiDraft(plan, draft, "2026-10-24");
    expect(next.source).toBe("gemini");
    expect(next.tasks[0].done).toBe(true);
    expect(next.budget).toEqual(plan.budget);
    next.tasks[1].done = true;
    expect(
      eventSchema.safeParse(applyAiDraft(next, draft, "2026-10-24")).success,
    ).toBe(true);
  });
  it("reports completed and overdue tasks", () => {
    const plan = createPlan(brief, "2026-10-24");
    plan.tasks[0].done = true;
    const stats = planStats(plan, "2027-02-21");
    expect(stats.days).toBe(-1);
    expect(stats.overdue).toBe(plan.tasks.length - 1);
    expect(stats.completed).toBe(1);
  });
  it("rejects duplicate IDs, missing prerequisites, cycles and backwards dependencies", () => {
    const plan = createPlan(brief, "2026-10-24");
    const copy = () => structuredClone(plan);
    const duplicate = copy();
    duplicate.tasks[1].id = duplicate.tasks[0].id;
    expect(eventSchema.safeParse(duplicate).success).toBe(false);
    const missing = copy();
    missing.tasks[0].dependsOn = ["missing"];
    expect(eventSchema.safeParse(missing).success).toBe(false);
    const cycle = copy();
    cycle.tasks[0].dependsOn = [cycle.tasks[1].id];
    expect(eventSchema.safeParse(cycle).success).toBe(false);
    const backwards = copy();
    backwards.tasks[0].dependsOn = [backwards.tasks[9].id];
    expect(eventSchema.safeParse(backwards).success).toBe(false);
  });
  it("rejects malformed model drafts", () => {
    expect(aiDraftSchema.safeParse({ ...draft, tasks: [] }).success).toBe(
      false,
    );
    expect(
      aiDraftSchema.safeParse({
        ...draft,
        runOfShow: [{ time: "25:00", title: "Invalid" }],
      }).success,
    ).toBe(false);
  });
});
