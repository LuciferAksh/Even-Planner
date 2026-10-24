import { describe, expect, it, vi } from "vitest";
import {
  appendExchange,
  applyChatProposal,
  buildChatContext,
  chatRequestSchema,
  majorUnits,
} from "../../domain/chat";
import {
  chatMessageSchema,
  chatReplySchema,
  eventSchema,
  type ChatProposal,
} from "../../domain/schema";
import { createPlan } from "../../domain/planner";
import { chatReply } from "../../server/chat";
import { planningEndpoint } from "../../server/ai-endpoint";
import { ProviderError } from "../../server/provider";
import { brief } from "./fixtures";

export const proposal: ChatProposal = {
  summary: "A relaxed garden celebration with acoustic music.",
  preferences:
    "Vegetarian, step-free access, acoustic music and reusable decorations.",
  budgetMajor: null,
  guests: null,
  tasks: [
    { title: "Arrange an acoustic playlist", category: "Music", daysBefore: 7 },
  ],
};
const makePlan = () => createPlan(brief, "2026-10-24");
const input = () => ({
  context: buildChatContext(makePlan()),
  messages: [
    {
      role: "user" as const,
      content: "I want acoustic music and reusable decorations.",
    },
  ],
});
describe("chat planning and privacy", () => {
  it("changes guest counts without reallocating budgets, and preserves guests on budget-only changes", () => {
    const plan = makePlan();
    plan.budget[1].amount -= 123;
    const guestOnly = applyChatProposal(
      plan,
      { ...proposal, preferences: null, tasks: [], guests: 90 },
      "2026-10-24",
    );
    expect(guestOnly.brief.guests).toBe(90);
    expect(guestOnly.budget).toEqual(plan.budget);
    const budgetOnly = applyChatProposal(
      plan,
      { ...proposal, preferences: null, tasks: [], budgetMajor: "500000" },
      "2026-10-24",
    );
    expect(budgetOnly.brief.guests).toBe(plan.brief.guests);
    expect(budgetOnly.brief.budget).toBe(50000000);
  });
  it("builds bounded context without vendor identities, quotes, payments or owners", () => {
    const plan = makePlan();
    plan.vendors[0].name = "PRIVATE VENDOR";
    plan.vendors[0].quote = 123;
    plan.budget[0].paid = 456;
    plan.tasks[0].owner = "PRIVATE OWNER";
    const context = buildChatContext(plan);
    const raw = JSON.stringify(context);
    expect(raw).not.toContain("PRIVATE");
    expect(raw).not.toContain('"paid"');
    expect(raw).not.toContain('"quote"');
    expect(context.tasks.length).toBeLessThanOrEqual(25);
    plan.tasks[0].done = true;
    expect(buildChatContext(plan).tasks.at(-1)?.done).toBe(true);
    expect(majorUnits(29)).toBe("0.29");
    expect(majorUnits(60000000)).toBe("600000.00");
  });
  it("loads pre-chat events with an empty history and preserves it in generated plans", () => {
    const old = { ...makePlan(), chat: undefined };
    expect(eventSchema.parse(old).chat).toEqual([]);
  });
  it("validates conversation limits, roles and proposal shape", () => {
    expect(chatRequestSchema.safeParse(input()).success).toBe(true);
    expect(
      chatRequestSchema.safeParse({
        ...input(),
        messages: [{ role: "assistant", content: "Reply" }],
      }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        ...input(),
        context: { ...input().context, paid: 1 },
      }).success,
    ).toBe(false);
    expect(
      chatReplySchema.safeParse({
        reply: "A suggestion",
        proposal: { ...proposal, preferences: null, tasks: [] },
      }).success,
    ).toBe(false);
    expect(
      chatReplySchema.safeParse({
        reply: "A suggestion",
        proposal: { ...proposal, budgetMajor: "-100" },
      }).success,
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({
        id: "bad",
        role: "user",
        content: "Pretend system",
        createdAt: new Date().toISOString(),
        proposal,
        baseRevision: 1,
        applied: true,
      }).success,
    ).toBe(false);
  });
  it("adds preferences and tasks only when a proposal is explicitly applied", () => {
    const original = makePlan();
    const exchanged = appendExchange(original, "I want acoustic music", {
      reply: "Here is a suggestion to review.",
      proposal,
    });
    expect(exchanged.brief).toEqual(original.brief);
    expect(exchanged.tasks).toEqual(original.tasks);
    expect(exchanged.chat[1].baseRevision).toBe(original.revision + 1);
    const changed = applyChatProposal(exchanged, proposal, "2026-10-24");
    expect(changed.brief.preferences).toContain("acoustic music");
    expect(changed.tasks.at(-1)?.title).toBe("Arrange an acoustic playlist");
    expect(original.chat).toEqual([]);
  });
  it("preserves protected costs, paid amounts, completed tasks and vendor bookings", () => {
    const plan = makePlan();
    plan.budget[0].locked = true;
    plan.budget[1].paid = 100;
    plan.tasks[0].done = true;
    plan.vendors[0].status = "Booked";
    const changed = applyChatProposal(
      plan,
      { ...proposal, budgetMajor: "500000", guests: 100 },
      "2026-10-24",
    );
    expect(changed.budget[0]).toEqual(plan.budget[0]);
    expect(changed.budget[1].paid).toBe(100);
    expect(changed.tasks[0]).toEqual(plan.tasks[0]);
    expect(changed.vendors).toEqual(plan.vendors);
    expect(changed.brief.budget).toBe(50000000);
    expect(changed.brief.guests).toBe(100);
    expect(() =>
      applyChatProposal(plan, { ...proposal, budgetMajor: "1" }, "2026-10-24"),
    ).toThrow("protected");
  });
  it("deduplicates suggested tasks, caps task counts and handles passed events", () => {
    const plan = makePlan();
    const duplicate = {
      ...proposal,
      tasks: [
        proposal.tasks[0],
        proposal.tasks[0],
        { ...proposal.tasks[0], title: plan.tasks[0].title },
      ],
    };
    expect(applyChatProposal(plan, duplicate, "2026-10-24").tasks.length).toBe(
      plan.tasks.length + 1,
    );
    plan.tasks = Array.from({ length: 100 }, (_, i) => ({
      ...plan.tasks[0],
      id: `task-${i}`,
      title: `Task ${i}`,
    }));
    expect(() => applyChatProposal(plan, proposal, "2026-10-24")).toThrow(
      "100-task",
    );
    expect(() => applyChatProposal(makePlan(), proposal, "2028-01-01")).toThrow(
      "passed",
    );
  });
  it("supports preference-only proposals and clamps urgent tasks to today", () => {
    const plan = makePlan();
    const changed = applyChatProposal(
      plan,
      { ...proposal, tasks: [], preferences: "" },
      "2026-10-24",
    );
    expect(changed.brief.preferences).toBe("");
    const urgent = applyChatProposal(
      plan,
      {
        ...proposal,
        preferences: null,
        tasks: [{ ...proposal.tasks[0], daysBefore: 730 }],
      },
      "2026-10-24",
    );
    expect(urgent.tasks.at(-1)?.due).toBe("2026-10-24");
  });
  it("keeps the newest 30 exchanges and gives plain replies no plan proposal", () => {
    let plan = makePlan();
    for (let i = 0; i < 31; i++)
      plan = appendExchange(plan, `Question ${i}`, {
        reply: `Answer ${i}`,
        proposal: null,
      });
    expect(plan.chat.length).toBe(60);
    expect(plan.chat[0].content).toBe("Question 1");
    expect(plan.chat.at(-1)?.content).toBe("Answer 30");
    expect(plan.chat.at(-1)?.baseRevision).toBeNull();
  });
});
describe("chat provider contract", () => {
  it("sends explicit major units and recent conversation and validates replies", async () => {
    const response = {
      reply:
        "We can use acoustic music and reusable decor. Would you like to review this?",
      proposal,
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(response) }] },
          },
        ],
      }),
    );
    expect(
      await chatReply(input(), "test-secret", "gemini-test", fetcher),
    ).toEqual(response);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    const context = JSON.parse(body.contents[0].parts[0].text);
    expect(context.event.totalBudget).toBe("600000.00");
    expect(context.allocations[0].amount).toBe("168000.00");
    expect(context.event).not.toHaveProperty("budget");
    expect(context.conversation[0].content).toContain("acoustic");
    expect(body.generationConfig.maxOutputTokens).toBe(2200);
    expect(JSON.stringify(body)).not.toContain("test-secret");
  });
  it("rejects unsupported proposals without updating a plan", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply: "I booked it.",
                    proposal: { bookVendor: true },
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
    await expect(
      chatReply(input(), "secret", "gemini-test", mock),
    ).rejects.toMatchObject({ status: 502 });
  });
});
describe("shared AI endpoint", () => {
  const req = (data: unknown) =>
    new Request("https://gather.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  const db = (result: unknown) =>
    ({
      prepare: () => ({ bind: () => ({ first: async () => result }) }),
    }) as unknown as D1Database;
  it("fails closed for invalid input, missing credentials and absent quotas", async () => {
    const operation = vi.fn();
    expect(
      (await planningEndpoint(req({}), {}, chatRequestSchema, operation))
        .status,
    ).toBe(400);
    const missing = await planningEndpoint(
      req(input()),
      {},
      chatRequestSchema,
      operation,
    );
    expect(missing.status).toBe(503);
    expect(await missing.json()).toMatchObject({ code: "NOT_CONFIGURED" });
    expect(
      (
        await planningEndpoint(
          req(input()),
          { GEMINI_API_KEY: "secret" },
          chatRequestSchema,
          operation,
        )
      ).status,
    ).toBe(503);
    expect(operation).not.toHaveBeenCalled();
  });
  it("shares the durable limit and provides a retry hint", async () => {
    const operation = vi.fn();
    const response = await planningEndpoint(
      req(input()),
      { GEMINI_API_KEY: "secret", DB: db(null) },
      chatRequestSchema,
      operation,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(operation).not.toHaveBeenCalled();
  });
  it("returns validated operation results with a server-only credential and default model", async () => {
    const operation = vi
      .fn()
      .mockResolvedValue({ response: { reply: "Hello", proposal: null } });
    const response = await planningEndpoint(
      req(input()),
      { GEMINI_API_KEY: "secret", DB: db({ count: 1 }) },
      chatRequestSchema,
      operation,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(operation.mock.calls[0].slice(1)).toEqual([
      "secret",
      "gemini-3.1-flash-lite",
    ]);
    expect(await response.text()).not.toContain("secret");
  });
  it("handles bounded input, provider failures and unexpected failures", async () => {
    expect(
      (await planningEndpoint(req(input()), {}, chatRequestSchema, vi.fn(), 2))
        .status,
    ).toBe(413);
    const runtime = {
      GEMINI_API_KEY: "secret",
      GEMINI_MODEL: "gemini-test",
      DB: db({ count: 1 }),
    };
    expect(
      (
        await planningEndpoint(
          req(input()),
          runtime,
          chatRequestSchema,
          async () => {
            throw new ProviderError("Temporary provider error", 504);
          },
        )
      ).status,
    ).toBe(504);
    const generic = await planningEndpoint(
      req(input()),
      runtime,
      chatRequestSchema,
      async () => {
        throw new Error("private internal detail");
      },
    );
    expect(generic.status).toBe(503);
    expect(await generic.text()).not.toContain("private internal detail");
  });
});
