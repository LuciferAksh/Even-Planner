export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function requestStructured({
  apiKey,
  model,
  instruction,
  input,
  schema,
  maxTokens = 6000,
  fetcher = fetch,
}: {
  apiKey: string;
  model: string;
  instruction: string;
  input: unknown;
  schema: object;
  maxTokens?: number;
  fetcher?: typeof fetch;
}): Promise<unknown> {
  if (!/^gemini-[a-z0-9.-]{1,70}$/.test(model))
    throw new ProviderError("The server model configuration is invalid.", 503);
  let response: Response;
  try {
    response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(input) }] },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
          },
        }),
        signal: AbortSignal.timeout(35000),
      },
    );
  } catch {
    throw new ProviderError(
      "Gemini could not be reached in time. Your plan and messages are safe; please try again.",
      504,
    );
  }
  if (response.status === 429)
    throw new ProviderError(
      "Gemini free-tier quota is busy or exhausted. Your plan and messages are safe; try again later.",
      429,
    );
  if (!response.ok)
    throw new ProviderError(
      `Gemini is unavailable (Google HTTP ${response.status}). Check the server configuration or try again later.`,
      503,
    );
  try {
    const raw = await response.text();
    if (raw.length > 100000) throw new Error("Oversized response");
    const payload = JSON.parse(raw) as {
      candidates?: {
        finishReason?: string;
        content?: { parts?: { text?: string }[] };
      }[];
    };
    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason !== "STOP")
      throw new Error("Incomplete response");
    return JSON.parse(
      candidate.content?.parts?.map((part) => part.text ?? "").join("") ?? "",
    );
  } catch {
    throw new ProviderError(
      "Gemini returned an incomplete or invalid response. Your existing plan is unchanged. Please try again.",
      502,
    );
  }
}
