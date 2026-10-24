import { z } from "zod";

export const eventTypes = ["wedding", "birthday", "community"] as const;
export const currencies = ["INR", "USD", "EUR", "GBP"] as const;
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date");
const text = (max: number) => z.string().trim().min(1).max(max);
export const briefSchema = z
  .object({
    title: text(100),
    type: z.enum(eventTypes),
    date: isoDate,
    location: text(120),
    guests: z.number().int().min(1).max(10000),
    budget: z.number().int().min(0).max(10000000000),
    currency: z.enum(currencies),
    preferences: z.string().trim().max(2000),
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid timezone"),
  })
  .strict();
export type Brief = z.infer<typeof briefSchema>;
export const budgetLineSchema = z
  .object({
    id: text(80),
    name: text(100),
    amount: z.number().int().min(0).max(10000000000),
    paid: z.number().int().min(0).max(10000000000),
    locked: z.boolean(),
  })
  .strict();
export const taskSchema = z
  .object({
    id: text(80),
    title: text(160),
    category: text(60),
    due: isoDate,
    done: z.boolean(),
    owner: z.string().max(80),
    dependsOn: z.array(text(80)).max(20),
  })
  .strict();
export const vendorSchema = z
  .object({
    id: text(80),
    category: text(80),
    name: z.string().max(100),
    status: z.enum(["To research", "Contacted", "Shortlisted", "Booked"]),
    quote: z.number().int().min(0).max(10000000000),
    questions: z.array(text(200)).max(5),
  })
  .strict();
export const ideaSchema = z
  .object({
    title: text(100),
    description: text(500),
    cost: z.enum(["Free", "Low", "Medium"]),
  })
  .strict();
export const runItemSchema = z
  .object({
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    title: text(120),
  })
  .strict();
export const eventSchema = z
  .object({
    id: text(80),
    revision: z.number().int().min(0),
    brief: briefSchema,
    budget: z.array(budgetLineSchema).min(1).max(20),
    tasks: z.array(taskSchema).min(1).max(100),
    vendors: z.array(vendorSchema).max(20),
    ideas: z.array(ideaSchema).max(12),
    runOfShow: z.array(runItemSchema).max(30),
    assumptions: z.array(text(300)).max(12),
    source: z.enum(["template", "gemini"]),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((event, ctx) => {
    for (const key of ["budget", "tasks", "vendors"] as const) {
      const ids = event[key].map((item) => item.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          message: `Duplicate ${key} identifiers`,
        });
    }
    const taskMap = new Map(event.tasks.map((task) => [task.id, task]));
    const checked = new Map<string, boolean>();
    const visit = (id: string, path: Set<string>): boolean => {
      if (checked.has(id)) return checked.get(id)!;
      if (path.has(id)) return false;
      const task = taskMap.get(id);
      if (!task) return false;
      const valid = task.dependsOn.every(
        (dep) =>
          visit(dep, new Set([...path, id])) &&
          taskMap.get(dep)!.due <= task.due &&
          (!task.done || taskMap.get(dep)!.done),
      );
      checked.set(id, valid);
      return valid;
    };
    if (!event.tasks.every((task) => visit(task.id, new Set())))
      ctx.addIssue({
        code: "custom",
        message: "Invalid task dependencies or dates",
      });
  });
export type EventPlan = z.infer<typeof eventSchema>;
export type Task = EventPlan["tasks"][number];
export const backupSchema = z
  .object({ version: z.literal(1), events: z.array(eventSchema).max(30) })
  .strict();

export const aiDraftSchema = z
  .object({
    tasks: z
      .array(
        z
          .object({
            title: text(160),
            category: text(60),
            daysBefore: z.number().int().min(0).max(730),
          })
          .strict(),
      )
      .min(5)
      .max(20),
    ideas: z.array(ideaSchema).min(3).max(6),
    assumptions: z
      .array(
        text(300).refine(
          (value) => value.startsWith("Verify "),
          "AI assumptions must be explicit verification checks",
        ),
      )
      .min(1)
      .max(6),
    runOfShow: z.array(runItemSchema).min(3).max(12),
  })
  .strict();
export type AiDraft = z.infer<typeof aiDraftSchema>;
