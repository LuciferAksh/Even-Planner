import fs from "node:fs";
const vars = Object.fromEntries(
  fs
    .readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf("=");
      let value = line.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        value = value.slice(1, -1);
      return [line.slice(0, index), value];
    }),
);
const key = vars.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is missing.");
  process.exit(1);
}
const model = vars.GEMINI_MODEL || "gemini-3.1-flash-lite";
if (!/^gemini-[a-z0-9.-]+$/.test(model)) {
  console.error("Invalid model name.");
  process.exit(1);
}
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Reply with the word OK." }] }],
      generationConfig: { maxOutputTokens: 16 },
    }),
    signal: AbortSignal.timeout(35000),
  },
);
const payload = await response.json();
const safe = (value) =>
  String(value)
    .replaceAll(key, "[redacted]")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]");
console.log(
  JSON.stringify(
    {
      model,
      status: response.status,
      success: response.ok,
      keyHasExpectedFormat: /^AIza[0-9A-Za-z_-]{35}$/.test(key),
      providerStatus: payload.error?.status,
      message: payload.error
        ? safe(payload.error.message)
        : "Google accepted the credential and model.",
    },
    null,
    2,
  ),
);
if (!response.ok) process.exitCode = 1;
