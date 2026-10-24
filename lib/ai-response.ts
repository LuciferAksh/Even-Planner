/** Narrow untrusted JSON before reading a response field. */
export function responseField(value: unknown, field: string): unknown {
  return typeof value === "object" && value !== null && field in value
    ? Reflect.get(value, field)
    : undefined;
}
export function responseError(value: unknown, fallback: string): string {
  if (value instanceof Error && !("issues" in value)) return value.message;
  const error = responseField(value, "error");
  return typeof error === "string" ? error : fallback;
}
