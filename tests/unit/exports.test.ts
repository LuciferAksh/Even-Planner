import { describe, expect, it, vi } from "vitest";
import {
  backupJson,
  budgetCsv,
  calendarFile,
  csvCell,
  download,
  foldLine,
} from "../../exports/files";
import { createPlan } from "../../domain/planner";
import { backupSchema } from "../../domain/schema";
import { brief } from "./fixtures";
describe("portable exports", () => {
  it("quotes CSV and protects formula injection", () => {
    expect(csvCell('hello,"there"')).toBe('"hello,""there"""');
    for (const value of ["=SUM(1)", " +2", "-4", "@danger", "\tformula"])
      expect(csvCell(value)).toContain("'");
    const csv = budgetCsv(createPlan(brief, "2026-10-24"));
    expect(csv).toContain("Planned (INR)");
    expect(csv).toContain("168000.00");
  });
  it("roundtrips a schema-versioned JSON backup", () => {
    const plan = createPlan(brief, "2026-10-24");
    expect(
      backupSchema.parse(JSON.parse(backupJson([plan]))).events[0],
    ).toEqual(plan);
    expect(backupSchema.safeParse({ version: 2, events: [] }).success).toBe(
      false,
    );
  });
  it("exports valid all-day deadlines, exclusive end dates and escaped text", () => {
    const plan = createPlan({ ...brief, title: "A; B, C\nD" }, "2026-10-24");
    const calendar = calendarFile(plan);
    expect(calendar).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20270220");
    expect(calendar).toContain("DTEND;VALUE=DATE:20270221");
    expect(calendar).toContain("SUMMARY:A\\; B\\, C\\nD");
    plan.tasks[0].done = true;
    expect(calendarFile(plan).split("BEGIN:VEVENT").length).toBe(
      calendar.split("BEGIN:VEVENT").length - 1,
    );
  });
  it("folds multibyte UTF-8 without exceeding 75 octets", () => {
    const text = "SUMMARY:" + "जन्मदिन🌿".repeat(35);
    const folded = foldLine(text);
    expect(
      folded
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(folded.replaceAll("\r\n ", "")).toBe(text);
  });
  it("downloads using revocable object URLs", () => {
    vi.useFakeTimers();
    const click = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ click }) });
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    download("example", "plan.txt", "text/plain");
    expect(click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
