import { describe, expect, it, vi } from "vitest";
import { generateDraft } from "../../server/gemini";
import { boundedJson } from "../../server/request";
import { takeQuota } from "../../server/quota";
import { brief, draft } from "./fixtures";
const request = (
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
) =>
  new Request("https://gather.test/api/generate", {
    method: "POST",
    headers,
    body,
  });
describe("request boundary", () => {
  it("caps rejected-body draining by bytes and time", async () => {
    await expect(
      boundedJson(request("x".repeat(70000), { "content-type": "text/plain" })),
    ).rejects.toMatchObject({ status: 415 });
    vi.useFakeTimers();
    try {
      const body = new ReadableStream<Uint8Array>({
        start() {
          /* stalled input */
        },
      });
      const input = new Request("https://gather.test", {
        method: "POST",
        body,
        duplex: "half",
        headers: { "content-type": "text/plain" },
      } as RequestInit & { duplex: string });
      const assertion = expect(boundedJson(input)).rejects.toMatchObject({
        status: 415,
      });
      await vi.advanceTimersByTimeAsync(1001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
  it("accepts same-origin bounded JSON", async () => {
    expect(
      await boundedJson(
        request('{"ok":true}', {
          "content-type": "application/json",
          origin: "https://gather.test",
        }),
      ),
    ).toEqual({ ok: true });
  });
  it("rejects wrong content type, cross-site, oversized and malformed requests", async () => {
    await expect(boundedJson(request("{}", {}))).rejects.toMatchObject({
      status: 415,
    });
    await expect(
      boundedJson(
        request("{}", {
          "content-type": "application/json",
          origin: "https://evil.test",
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      boundedJson(
        request("{}", {
          "content-type": "application/json",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      boundedJson(
        request("{}", {
          "content-type": "application/json",
          "content-length": "13000",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      boundedJson(request("x".repeat(100)), 10),
    ).rejects.toMatchObject({ status: 413 });
    await expect(boundedJson(request("no json"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      boundedJson(
        new Request("https://gather.test", {
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
describe("Gemini adapter", () => {
  const fetcher = (response: Response) =>
    vi.fn<typeof fetch>().mockResolvedValue(response);
  const payload = (content: unknown = draft, finishReason = "STOP") =>
    Response.json({
      candidates: [
        {
          finishReason,
          content: { parts: [{ text: JSON.stringify(content) }] },
        },
      ],
    });
  it("requests bounded structured output with a header-only credential", async () => {
    const mock = fetcher(payload());
    expect(
      await generateDraft(brief, "test-secret", "gemini-2.5-flash", mock),
    ).toEqual(draft);
    const [url, init] = mock.mock.calls[0];
    expect(String(url)).not.toContain("test-secret");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "test-secret" });
    expect(String(init?.body)).not.toContain("test-secret");
    expect(String(init?.body)).toContain("untrusted event data");
    const body = JSON.parse(String(init?.body));
    const eventContext = JSON.parse(body.contents[0].parts[0].text);
    expect(eventContext.totalBudget).toBe('600000.00');
    expect(eventContext).not.toHaveProperty('budget');
  });
  it("rejects unsafe model paths", async () => {
    await expect(
      generateDraft(brief, "key", "../secret", fetcher(payload())),
    ).rejects.toMatchObject({ status: 503 });
  });
  it.each([429, 401, 500])(
    "handles provider HTTP %s without exposing response data",
    async (status) => {
      await expect(
        generateDraft(
          brief,
          "secret",
          "gemini-test",
          fetcher(new Response("secret details", { status })),
        ),
      ).rejects.toMatchObject({ status: status === 429 ? 429 : 503 });
    },
  );
  it("handles network failure and timeouts", async () => {
    await expect(
      generateDraft(
        brief,
        "key",
        "gemini-test",
        vi.fn<typeof fetch>().mockRejectedValue(new Error("network")),
      ),
    ).rejects.toMatchObject({ status: 504 });
  });
  it("rejects incomplete, malformed, blocked, oversized and unordered responses", async () => {
    const unordered = { ...draft, runOfShow: [...draft.runOfShow].reverse() };
    for (const response of [
      payload({}, "STOP"),
      payload(draft, "MAX_TOKENS"),
      Response.json({}),
      new Response("not-json"),
      new Response("x".repeat(100001)),
      payload(unordered),
    ])
      await expect(
        generateDraft(brief, "key", "gemini-test", fetcher(response)),
      ).rejects.toMatchObject({ status: 502 });
  });
});
describe("durable rate limit", () => {
  it("uses one atomic conditional upsert and fails closed at capacity", async () => {
    const first = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(null);
    const bind = vi.fn((bucket: number) => {
      expect(bucket).toBeGreaterThanOrEqual(0);
      return { first };
    });
    const prepare = vi.fn((sql: string) => {
      expect(sql).toContain("ON CONFLICT");
      return { bind };
    });
    const db = { prepare } as unknown as D1Database;
    expect(await takeQuota(db, 60000)).toBe(true);
    expect(await takeQuota(db, 60000)).toBe(false);
    expect(prepare.mock.calls[0][0]).toContain("RETURNING count");
    expect(bind).toHaveBeenCalledWith(1);
  });
});
