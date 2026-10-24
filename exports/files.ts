import type { EventPlan } from "../domain/schema";
import { shiftDate } from "../domain/dates";

export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function budgetCsv(plan: EventPlan): string {
  return (
    "\uFEFF" +
    [
      [
        "Category",
        `Planned (${plan.brief.currency})`,
        `Paid (${plan.brief.currency})`,
        "Protected",
      ],
      ...plan.budget.map((line) => [
        line.name,
        (line.amount / 100).toFixed(2),
        (line.paid / 100).toFixed(2),
        line.locked ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
function icsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}
/** Fold at <= 75 UTF-8 octets, including the continuation space. */
export function foldLine(value: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let line = "";
  let length = 0;
  for (const char of value) {
    const size = encoder.encode(char).length;
    if (length + size > 75) {
      lines.push(line);
      line = " ";
      length = 1;
    }
    line += char;
    length += size;
  }
  lines.push(line);
  return lines.join("\r\n");
}
export function calendarFile(plan: EventPlan): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const entries = [
    { id: "event", title: plan.brief.title, due: plan.brief.date },
    ...plan.tasks.filter((task) => !task.done),
  ];
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gather//Event Planner//EN",
      "CALSCALE:GREGORIAN",
      ...entries.flatMap((item) => [
        "BEGIN:VEVENT",
        `UID:${icsText(plan.id)}-${icsText(item.id)}@gather.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${item.due.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${shiftDate(item.due, 1).replaceAll("-", "")}`,
        `SUMMARY:${icsText(item.title)}`,
        `DESCRIPTION:${icsText(`Planning deadline for ${plan.brief.title}. Event timezone: ${plan.brief.timezone}.`)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ]
      .map(foldLine)
      .join("\r\n") + "\r\n"
  );
}
export function backupJson(events: EventPlan[]): string {
  return JSON.stringify({ version: 1, events }, null, 2);
}
export function download(
  content: string,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
