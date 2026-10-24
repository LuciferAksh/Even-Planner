// Explicitly invoked smoke test; uses fictional data and consumes free-tier quota.
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
for (const type of ["birthday", "community"]) {
  const started = Date.now();
  const response = await fetch(new URL("/api/generate", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Fictional ${type} gathering`,
      type,
      date: "2027-02-20",
      location: "Jaipur",
      guests: 30,
      budget: 3000000,
      currency: "INR",
      preferences:
        type === "birthday"
          ? "A quiet adults birthday with vegetarian food and reusable decorations."
          : "Volunteer-led neighborhood gathering with step-free routes, quiet seating, and cleanup responsibilities.",
      timezone: "Asia/Kolkata",
    }),
    signal: AbortSignal.timeout(45000),
  });
  const payload = await response.json();
  console.log(
    JSON.stringify({
      type,
      status: response.status,
      elapsedMs: Date.now() - started,
      tasks: payload.draft?.tasks?.length,
      ideas: payload.draft?.ideas?.length,
      scheduleEntries: payload.draft?.runOfShow?.length,
      error: payload.error,
    }),
  );
  if (!response.ok) process.exitCode = 1;
}
