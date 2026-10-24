import { z } from "zod";
import {
  briefSchema,
  chatProposalSchema,
  chatReplySchema,
  eventSchema,
  isoDate,
  type ChatMessage,
  type ChatProposal,
  type ChatReply,
  type EventPlan,
} from "./schema";
import { localToday, shiftDate } from "./dates";
import { parseMoney } from "./money";
import { scenario } from "./planner";

export const chatContextSchema = z
  .object({
    brief: briefSchema,
    allocations: z
      .array(
        z
          .object({
            name: z.string().max(100),
            amount: z.number().int().min(0).max(10000000000),
            locked: z.boolean(),
          })
          .strict(),
      )
      .max(20),
    tasks: z
      .array(
        z
          .object({
            title: z.string().max(160),
            due: isoDate,
            done: z.boolean(),
          })
          .strict(),
      )
      .max(25),
    vendors: z
      .array(
        z
          .object({
            category: z.string().max(80),
            status: z.enum([
              "To research",
              "Contacted",
              "Shortlisted",
              "Booked",
            ]),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export const chatRequestSchema = z
  .object({
    context: chatContextSchema,
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(3000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (input) => input.messages.at(-1)?.role === "user",
    "End the conversation with your message",
  );
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Exclude vendor identities, quotes, payments, and task owners from AI context. */
export function buildChatContext(event: EventPlan): ChatRequest["context"] {
  return chatContextSchema.parse({
    brief: event.brief,
    allocations: event.budget.map(({ name, amount, locked }) => ({
      name,
      amount,
      locked,
    })),
    tasks: [
      ...event.tasks.filter((task) => !task.done),
      ...event.tasks.filter((task) => task.done),
    ]
      .slice(0, 25)
      .map(({ title, due, done }) => ({ title, due, done })),
    vendors: event.vendors.map(({ category, status }) => ({
      category,
      status,
    })),
  });
}
export function majorUnits(amount: number): string {
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

export function applyChatProposal(
  event: EventPlan,
  raw: ChatProposal,
  today = localToday(event.brief.timezone),
): EventPlan {
  const proposal = chatProposalSchema.parse(raw);
  if (event.brief.date < today)
    throw new Error(
      "This event has passed. Start a future event before adding preparation tasks.",
    );
  let next = structuredClone(event);
  if (proposal.budgetMajor !== null)
    next = scenario(
      next,
      parseMoney(proposal.budgetMajor),
      proposal.guests ?? event.brief.guests,
    );
  else if (proposal.guests !== null) next.brief.guests = proposal.guests;
  if (proposal.preferences !== null)
    next.brief.preferences = proposal.preferences;
  const titles = new Set(next.tasks.map((task) => task.title.toLowerCase()));
  const additions = proposal.tasks
    .filter((task) => {
      const key = task.title.toLowerCase();
      if (titles.has(key)) return false;
      titles.add(key);
      return true;
    })
    .map((task) => ({
      id: crypto.randomUUID(),
      title: task.title,
      category: task.category,
      due: [today, shiftDate(event.brief.date, -task.daysBefore)]
        .sort()
        .at(-1)!,
      done: false,
      owner: "",
      dependsOn: [],
    }));
  if (next.tasks.length + additions.length > 100)
    throw new Error(
      "This event has reached its 100-task limit. Review your checklist before adding more.",
    );
  return eventSchema.parse({
    ...next,
    tasks: [...next.tasks, ...additions],
    revision: event.revision + 1,
    updatedAt: new Date().toISOString(),
  });
}
export function appendExchange(
  event: EventPlan,
  userText: string,
  raw: ChatReply,
): EventPlan {
  const reply = chatReplySchema.parse(raw);
  const now = new Date().toISOString();
  const messages: ChatMessage[] = [
    {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      createdAt: now,
      proposal: null,
      baseRevision: null,
      applied: false,
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: reply.reply,
      createdAt: now,
      proposal: reply.proposal,
      baseRevision: reply.proposal ? event.revision + 1 : null,
      applied: false,
    },
  ];
  return eventSchema.parse({
    ...event,
    chat: [...event.chat, ...messages].slice(-60),
    revision: event.revision + 1,
    updatedAt: now,
  });
}
