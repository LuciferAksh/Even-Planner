import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBriefForm } from "../../domain/brief-form";
import { brief } from "./fixtures";

afterEach(() => vi.useRealTimers());
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries(brief))
    data.set(key, String(value));
  data.set("budget", "600000.00");
  return data;
}
describe("accessible event brief validation", () => {
  it("parses exact money and the selected event type", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    const result = parseBriefForm(form(), "community");
    expect(result).toEqual({
      success: true,
      brief: { ...brief, type: "community" },
    });
  });
  it("identifies money precision errors without coercing them", () => {
    const data = form();
    data.set("budget", "3.141");
    expect(parseBriefForm(data, "wedding")).toMatchObject({
      success: false,
      errors: { budget: expect.stringContaining("decimal") },
    });
  });
  it("returns per-field errors for invalid timezone and guest count", () => {
    const data = form();
    data.set("timezone", "Invalid/Zone");
    data.set("guests", "0");
    expect(parseBriefForm(data, "birthday")).toMatchObject({
      success: false,
      errors: { timezone: expect.any(String), guests: expect.any(String) },
    });
  });
  it("keeps the first error for a field with multiple schema failures", () => {
    const data = form();
    data.set("date", "invalid");
    const result = parseBriefForm(data, "wedding");
    expect(result).toMatchObject({
      success: false,
      errors: { date: expect.any(String) },
    });
  });
  it("rejects a past event according to the chosen timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T21:00:00Z"));
    const data = form();
    data.set("date", "2026-10-25");
    expect(parseBriefForm(data, "wedding")).toMatchObject({
      success: false,
      errors: { date: expect.stringContaining("future") },
    });
  });
});
