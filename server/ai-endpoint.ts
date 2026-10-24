import type { z } from "zod";
import { boundedJson, RequestError } from "./request";
import { ProviderError } from "./provider";
import { takeQuota } from "./quota";
export type AiRuntime = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  DB?: D1Database;
};
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function planningEndpoint<T>(
  request: Request,
  runtime: AiRuntime,
  schema: z.ZodType<T>,
  operation: (input: T, apiKey: string, model: string) => Promise<unknown>,
  limit = 12000,
): Promise<Response> {
  try {
    const parsed = schema.safeParse(await boundedJson(request, limit));
    if (!parsed.success)
      return Response.json(
        { error: "Check your message and event details, then try again." },
        { status: 400, headers },
      );
    if (!runtime.GEMINI_API_KEY)
      return Response.json(
        {
          error:
            "Gemini is not configured yet. You can still use and edit your event plan.",
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
    return Response.json(
      await operation(
        parsed.data,
        runtime.GEMINI_API_KEY,
        runtime.GEMINI_MODEL || "gemini-3.1-flash-lite",
      ),
      { headers },
    );
  } catch (error) {
    if (error instanceof RequestError || error instanceof ProviderError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return Response.json(
      {
        error:
          "AI planning is temporarily unavailable. Your plan and messages are safe.",
      },
      { status: 503, headers },
    );
  }
}
