export function localToday(
  timezone = "Asia/Kolkata",
  now = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDate(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
/** Preparation deadlines cannot precede the day the plan is created. */
export function preparationDate(
  eventDate: string,
  daysBefore: number,
  today: string,
): string {
  const suggested = shiftDate(eventDate, -daysBefore);
  return suggested < today ? today : suggested;
}
export function dayDistance(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86400000,
  );
}
export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
