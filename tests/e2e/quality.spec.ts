import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createPlan } from "../../domain/planner";
import { brief } from "../unit/fixtures";

test("reselecting an event resets its view without losing saved changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  const nav = page.getByRole("navigation", { name: "Event sections" });
  await nav.getByRole("button", { name: "Budget", exact: true }).click();
  await page.getByLabel("Paid Venue & rentals").fill("123");
  await page.getByLabel("Paid Venue & rentals").press("Tab");
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  await page
    .getByRole("button", { name: "Maya & Arjun’s wedding", exact: true })
    .first()
    .click();
  await expect(
    nav.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(page.getByLabel("Paid Venue & rentals")).toHaveValue("123");
});

test("invalid event fields are named, described, focused, and recover after correction", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an event", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Accessible planning check");
  await page.getByLabel("City or location", { exact: true }).fill("Jaipur");
  const timezone = page.getByLabel("Timezone", { exact: true });
  await timezone.fill("Invalid/Zone");
  await page.getByRole("button", { name: "Create my event" }).click();
  await expect(timezone).toBeFocused();
  await expect(timezone).toHaveAttribute("aria-invalid", "true");
  await expect(timezone).toHaveAccessibleDescription(/valid timezone/);
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "Accessible planning check",
  );
  await expect(
    page.getByLabel("City or location", { exact: true }),
  ).toHaveValue("Jaipur");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await timezone.fill("Asia/Kolkata");
  await page.getByRole("button", { name: "Create my event" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Accessible planning check",
  );
});

test("task targets, progress, and focus remain usable in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  const first = page.getByRole("checkbox").first();
  const target = await first.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(24);
  expect(target?.height).toBeGreaterThanOrEqual(24);
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await expect(
    page.getByRole("progressbar", { name: "Preparation tasks completed" }),
  ).toHaveAttribute("aria-valuenow", "10");
  await expect(first).toBeFocused();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("pre-chat backups keep protected budgets, completed tasks, and owners on import", async ({
  page,
}) => {
  const plan = createPlan(brief, "2026-10-24");
  plan.budget[0].locked = true;
  plan.budget[0].paid = 12345;
  plan.tasks[0].done = true;
  plan.tasks[0].owner = "Fictional coordinator";
  const { chat: _legacyHasNoChat, ...legacy } = plan;
  void _legacyHasNoChat;
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create an event", exact: true }).first(),
  ).toBeEnabled();
  await page.getByLabel("Import event backup", { exact: true }).setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 1, events: [legacy] })),
  });
  await expect(page.getByRole("status")).toHaveText(
    "Backup imported as separate events.",
  );
  await page
    .getByRole("button", { name: brief.title, exact: true })
    .first()
    .click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  const nav = page.getByRole("navigation", { name: "Event sections" });
  await nav.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByLabel(`Owner for ${plan.tasks[0].title}`)).toHaveValue(
    "Fictional coordinator",
  );
  await nav.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(page.getByLabel("Paid Venue & rentals")).toHaveValue("123.45");
  await expect(
    page.getByRole("button", { name: "Unlock Venue & rentals" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chat with Gather" }).click();
  await expect(
    page.getByText("Let’s think it through, together."),
  ).toBeVisible();
});

test("cross-tab conflicts report the problem and preserve the first saved edit", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other
    .getByRole("button", { name: "Maya & Arjun’s wedding", exact: true })
    .first()
    .click();
  for (const tab of [page, other])
    await tab
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("button", { name: "Budget", exact: true })
      .click();
  await page.getByLabel("Paid Venue & rentals").fill("123");
  await page.getByLabel("Paid Venue & rentals").press("Tab");
  await expect(page.getByRole("status")).toHaveText("Changes saved");
  await other.getByLabel("Paid Venue & rentals").fill("555");
  await other.getByLabel("Paid Venue & rentals").press("Tab");
  await expect(other.getByRole("alert")).toContainText("another tab");
  await other.reload();
  await other
    .getByRole("button", { name: "Maya & Arjun’s wedding", exact: true })
    .first()
    .click();
  await other
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("button", { name: "Budget", exact: true })
    .click();
  await expect(other.getByLabel("Paid Venue & rentals")).toHaveValue("123");
});
