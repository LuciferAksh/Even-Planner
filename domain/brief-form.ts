import { briefSchema, type Brief } from "./schema";
import { parseMoney } from "./money";
import { localToday } from "./dates";

type BriefField = keyof Brief;
export type BriefErrors = Partial<Record<BriefField, string>>;
type FormResult =
  { success: true; brief: Brief } | { success: false; errors: BriefErrors };

/** Return field errors as data so the form can name and focus invalid inputs. */
export function parseBriefForm(
  form: FormData,
  type: Brief["type"],
): FormResult {
  let budget: number;
  try {
    budget = parseMoney(String(form.get("budget")));
  } catch {
    return {
      success: false,
      errors: {
        budget: "Enter a non-negative amount with up to two decimal places.",
      },
    };
  }
  const result = briefSchema.safeParse({
    title: form.get("title"),
    type,
    date: form.get("date"),
    location: form.get("location"),
    guests: Number(form.get("guests")),
    budget,
    currency: form.get("currency"),
    preferences: form.get("preferences"),
    timezone: form.get("timezone"),
  });
  if (!result.success) {
    const errors: BriefErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field in briefSchema.shape)
        errors[field as BriefField] ??= issue.message;
    }
    return { success: false, errors };
  }
  if (result.data.date < localToday(result.data.timezone))
    return {
      success: false,
      errors: { date: "Choose today or a future event date." },
    };
  return { success: true, brief: result.data };
}
