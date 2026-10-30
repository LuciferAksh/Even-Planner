import { describe, expect, it } from "vitest";
import {
  aiDraftSchema,
  chatReplySchema,
  suggestedTaskSchema,
} from "../../domain/schema";
import { draftJsonSchema } from "../../server/gemini";
import { chatJsonSchema } from "../../server/chat";
import { draft } from "./fixtures";

describe("shared provider and application contracts", () => {
  it("gives Gemini the same bounded task fields accepted by the application", () => {
    const task = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 160 },
        category: { type: "string", maxLength: 60 },
        daysBefore: { type: "integer", minimum: 0, maximum: 730 },
      },
      required: ["title", "category", "daysBefore"],
    };
    expect(draftJsonSchema).toMatchObject({
      properties: { tasks: { minItems: 5, maxItems: 20, items: task } },
    });
    expect(chatJsonSchema).toMatchObject({
      properties: {
        proposal: {
          anyOf: [
            { properties: { tasks: { maxItems: 5, items: task } } },
            { type: "null" },
          ],
        },
      },
    });
    expect(
      suggestedTaskSchema.safeParse({
        ...draft.tasks[0],
        title: "x".repeat(161),
      }).success,
    ).toBe(false);
    expect(
      suggestedTaskSchema.safeParse({ ...draft.tasks[0], extra: "untrusted" })
        .success,
    ).toBe(false);
  });
  it("keeps assumption checks, idea lengths, valid times and strict objects in the provider schema", () => {
    expect(draftJsonSchema).toMatchObject({
      additionalProperties: false,
      properties: {
        assumptions: { items: { maxLength: 300, pattern: "^Verify " } },
        ideas: {
          items: {
            additionalProperties: false,
            properties: { description: { maxLength: 500 } },
          },
        },
        runOfShow: {
          items: {
            properties: {
              time: { pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
              title: { maxLength: 120 },
            },
          },
        },
      },
    });
    expect(
      aiDraftSchema.safeParse({
        ...draft,
        assumptions: ["A venue is guaranteed"],
      }).success,
    ).toBe(false);
  });
  it("validates chronological order in every consumer, including the browser", () => {
    expect(aiDraftSchema.safeParse(draft).success).toBe(true);
    expect(
      aiDraftSchema.safeParse({
        ...draft,
        runOfShow: [...draft.runOfShow].reverse(),
      }).success,
    ).toBe(false);
  });
  it("retains semantic validation for proposals that JSON Schema cannot fully represent", () => {
    expect(
      chatReplySchema.safeParse({ reply: "Advice only", proposal: null })
        .success,
    ).toBe(true);
    expect(
      chatReplySchema.safeParse({
        reply: "Empty suggestion",
        proposal: {
          summary: "No changes",
          preferences: null,
          budgetMajor: null,
          guests: null,
          tasks: [],
        },
      }).success,
    ).toBe(false);
  });
});
