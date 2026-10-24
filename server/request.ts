export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function boundedJson(
  request: Request,
  limit = 12000,
): Promise<unknown> {
  const reject = async (message: string, status: number): Promise<never> => {
    // Drain small rejected inputs before replying. Canceling an unread body can
    // reset a reused HTTP connection in Worker preview proxies. Never drain an
    // unbounded attacker-controlled stream: cap both bytes and elapsed time.
    const reader = request.body?.getReader();
    if (reader) {
      const timeout = setTimeout(() => {
        void reader.cancel().catch(() => {});
      }, 1000);
      try {
        let discarded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          discarded += value.byteLength;
          if (discarded > 65536) {
            await reader.cancel();
            break;
          }
        }
      } catch {
        /* closed or aborted input still receives the intended error */
      } finally {
        clearTimeout(timeout);
        reader.releaseLock();
      }
    }
    throw new RequestError(message, status);
  };
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return reject("Send JSON event data.", 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reject("Cross-origin requests are not allowed.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return reject("Cross-site requests are not allowed.", 403);
  if (Number(request.headers.get("content-length")) > limit)
    return reject("Event details are too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Event details are required.", 400);
  let size = 0;
  let raw = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestError("Event details are too large.", 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Event data must be valid JSON.", 400);
  }
}
