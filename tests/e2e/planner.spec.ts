import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("all event types create complete plans and persist after reload", async ({
  page,
}) => {
  await page.goto("/");
  for (const type of ["Wedding", "Birthday", "Community"]) {
    await page
      .getByRole("button", { name: "Create an event", exact: true })
      .first()
      .click();
    await page.getByRole("radio", { name: type, exact: true }).check();
    await page
      .getByLabel("Event name", { exact: true })
      .fill(`${type} celebration`);
    await page.getByLabel("City or location").fill("Jaipur");
    await page.getByRole("button", { name: "Create my event" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${type} celebration`,
    );
    await expect(
      page.getByText("Template plan", { exact: true }),
    ).toBeVisible();
    for (const section of ["Budget", "Timeline", "Vendors", "Ideas"]) {
      await page
        .getByRole("navigation", { name: "Event sections" })
        .getByRole("button", { name: section, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { level: 2 }).first(),
      ).toBeVisible();
    }
    await page.reload();
    await page
      .getByRole("button", { name: new RegExp(`${type} celebration`) })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${type} celebration`,
    );
    await page.getByRole("button", { name: /My events/ }).click();
  }
});
test("budget locks, scenario diff, undo, tasks and downloads work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("button", { name: "Budget", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Protect Venue & rentals", exact: true })
    .click();
  await expect(
    page.getByLabel("Planned Venue & rentals", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Compare a scenario" }).click();
  await page.getByRole("button", { name: "Preview changes" }).click();
  await expect(page.getByText("Here’s what would change")).toBeVisible();
  await page.getByRole("button", { name: "Apply this scenario" }).click();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("gather-budget.csv");
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("button", { name: "Timeline", exact: true })
    .click();
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByLabel("Search tasks").fill("zzzzzz");
  await expect(page.getByText("No tasks match this view.")).toBeVisible();
});
test("AI failure preserves plan and malicious event text renders as text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Free-tier quota exhausted. Your plan is safe.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Personalize with AI" }).click();
  await page.getByRole("button", { name: "Personalize my plan" }).click();
  await expect(page.getByRole("alert")).toContainText("quota exhausted");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maya & Arjun’s wedding",
  );
});
test("core views pass automated WCAG checks on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  const check = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await check();
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await check();
  for (const section of ["Budget", "Timeline", "Vendors", "Ideas"]) {
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("button", { name: section, exact: true })
      .click();
    await check();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
