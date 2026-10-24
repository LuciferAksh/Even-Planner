import { env } from "cloudflare:workers";
import { briefSchema } from "../../../domain/schema";
import { generateDraft, ProviderError } from "../../../server/gemini";
import { boundedJson, RequestError } from "../../../server/request";
import { takeQuota } from "../../../server/quota";
import { localToday } from "../../../domain/dates";

type Runtime = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  DB?: D1Database;
};
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function POST(request: Request): Promise<Response> {
  try {
    const input = await boundedJson(request);
    const parsed = briefSchema.safeParse(input);
    if (!parsed.success)
      return Response.json(
        { error: "Check the event details and try again." },
        { status: 400, headers },
      );
    if (parsed.data.date < localToday(parsed.data.timezone))
      return Response.json(
        { error: "Choose a future event date." },
        { status: 400, headers },
      );
    const runtime = env as unknown as Runtime;
    const key = runtime.GEMINI_API_KEY;
    if (!key)
      return Response.json(
        {
          error:
            "Gemini is not configured yet. You can use and edit a complete template plan.",
          code: "NOT_CONFIGURED",
        },
        { status: 503, headers },
      );
    if (!runtime.DB)
      return Response.json(
        {
          error:
            "AI request protection is unavailable. Keep using your saved plan.",
        },
        { status: 503, headers },
      );
    if (!(await takeQuota(runtime.DB)))
      return Response.json(
        {
          error:
            "The planner is handling several AI requests. Please wait a minute before trying again.",
        },
        { status: 429, headers: { ...headers, "Retry-After": "60" } },
      );
    const draft = await generateDraft(
      parsed.data,
      key,
      runtime.GEMINI_MODEL || "gemini-3.1-flash-lite",
    );
    return Response.json({ draft }, { headers });
  } catch (error) {
    if (error instanceof RequestError || error instanceof ProviderError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return Response.json(
      {
        error:
          "Planning is temporarily unavailable. Your existing plan is safe.",
      },
      { status: 503, headers },
    );
  }
}
