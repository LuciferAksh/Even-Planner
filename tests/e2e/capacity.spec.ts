import { test, expect } from "@playwright/test";
import { createPlan } from "../../domain/planner";
import { MAX_EVENTS } from "../../domain/schema";
import { backupJson } from "../../exports/files";
import { brief } from "../unit/fixtures";

test("simultaneous tabs cannot exceed capacity or make saved events unreadable", async ({
  page,
  context,
}) => {
  const events = Array.from({ length: MAX_EVENTS - 1 }, () =>
    createPlan(brief, "2026-10-24"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create an event", exact: true }).first(),
  ).toBeEnabled();
  await page.getByLabel("Import event backup", { exact: true }).setInputFiles({
    name: "capacity.json",
    mimeType: "application/json",
    buffer: Buffer.from(backupJson(events)),
  });
  await expect(page.getByRole("status")).toHaveText(
    "Backup imported as separate events.",
  );
  const other = await context.newPage();
  await other.goto("/");
  for (const [index, tab] of [page, other].entries()) {
    await tab
      .getByRole("button", { name: "Create an event", exact: true })
      .first()
      .click();
    await tab
      .getByLabel("Event name", { exact: true })
      .fill(`Capacity event ${index}`);
    await tab.getByLabel("City or location", { exact: true }).fill("Jaipur");
  }
  await Promise.all(
    [page, other].map((tab) =>
      tab.getByRole("button", { name: "Create my event" }).click(),
    ),
  );
  await expect
    .poll(async () => {
      const counts = await Promise.all(
        [page, other].map((tab) =>
          tab
            .getByRole("heading", { level: 1, name: /Capacity event/ })
            .count(),
        ),
      );
      return counts[0] + counts[1];
    })
    .toBe(1);
  const rejected = (await page.getByRole("dialog").isVisible()) ? page : other;
  await expect(rejected.getByRole("dialog").getByRole("alert")).toContainText(
    "30 events",
  );
  await expect(rejected.getByLabel("Event name", { exact: true })).toHaveValue(
    /Capacity event/,
  );
  await rejected.getByRole("button", { name: "Close dialog" }).click();
  await rejected.reload();
  await expect(
    rejected.getByRole("heading", { name: /Your events/ }),
  ).toContainText(String(MAX_EVENTS));
  await expect(
    rejected.getByRole("button", { name: "Import backup", exact: true }),
  ).toBeEnabled();
});
