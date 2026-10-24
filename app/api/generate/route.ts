import { env } from "cloudflare:workers";
import { briefSchema } from "../../../domain/schema";
import { generateDraft } from "../../../server/gemini";
import { planningEndpoint } from "../../../server/ai-endpoint";
import { localToday } from "../../../domain/dates";
const currentBrief = briefSchema.refine(
  (brief) => brief.date >= localToday(brief.timezone),
  "Choose a future event date.",
);
export async function POST(request: Request): Promise<Response> {
  return planningEndpoint(
    request,
    env,
    currentBrief,
    async (input, key, model) => ({
      draft: await generateDraft(input, key, model),
    }),
  );
}
