import { env } from "cloudflare:workers";
import { chatRequestSchema } from "../../../domain/chat";
import { chatReply } from "../../../server/chat";
import { planningEndpoint } from "../../../server/ai-endpoint";
export async function POST(request: Request): Promise<Response> {
  return planningEndpoint(
    request,
    env,
    chatRequestSchema,
    async (input, key, model) => ({
      response: await chatReply(input, key, model),
    }),
    60000,
  );
}
