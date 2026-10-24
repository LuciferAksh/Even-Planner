import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { draft } from "../unit/fixtures";

test("keyboard dialog dismissal restores focus and form is accessible", async ({
  page,
}) => {
  await page.goto("/");
  const create = page
    .getByRole("button", { name: "Create an event", exact: true })
    .last();
  await expect(create).toBeEnabled();
  await create.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(create).toBeFocused();
});
test("vendor fields persist, backups import separately, and mobile sections fit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  const nav = page.getByRole("navigation", { name: "Event sections" });
  await nav.getByRole("button", { name: "Vendors", exact: true }).click();
  await page
    .getByLabel("Vendor name", { exact: true })
    .first()
    .fill("Fictional Garden Venue");
  await page.getByLabel("Booking status").first().selectOption("Booked");
  await page.getByLabel("Quote (INR)").first().fill("150000");
  await page.getByLabel("Quote (INR)").first().press("Tab");
  await page.reload();
  await page
    .getByRole("button", { name: "Maya & Arjun’s wedding", exact: true })
    .first()
    .click();
  await nav.getByRole("button", { name: "Vendors", exact: true }).click();
  await expect(
    page.getByLabel("Vendor name", { exact: true }).first(),
  ).toHaveValue("Fictional Garden Venue");
  await expect(page.getByLabel("Booking status").first()).toHaveValue("Booked");
  await expect(page.getByLabel("Quote (INR)").first()).toHaveValue("150000");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const section of [
    "Overview",
    "Budget",
    "Timeline",
    "Vendors",
    "Ideas",
  ]) {
    await nav.getByRole("button", { name: section, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
  }
});
test("AI success changes source while late AI results cannot overwrite edits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await page.route("**/api/generate", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ draft }),
    }),
  );
  await page.getByRole("button", { name: "Personalize with AI" }).click();
  await page.getByRole("button", { name: "Personalize my plan" }).click();
  await expect(
    page.getByText("Gemini personalized", { exact: true }),
  ).toBeVisible();
  let resolveRequest: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    resolveRequest = resolve;
  });
  await page.unroute("**/api/generate");
  await page.route("**/api/generate", async (route) => {
    await gate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ draft }),
    });
  });
  await page.getByRole("button", { name: "Personalize with AI" }).click();
  await page.getByRole("button", { name: "Personalize my plan" }).click();
  await page.getByRole("checkbox").first().check();
  resolveRequest!();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.getByRole("status")).toContainText("event changed");
});
test("request endpoint rejects unsafe input and exposes no credential", async ({
  request,
}) => {
  const malformed = await request.post("/api/generate", {
    headers: { "content-type": "application/json" },
    data: "not json",
  });
  expect(malformed.status()).toBe(400);
  const crossOrigin = await request.post("/api/generate", {
    headers: { origin: "https://evil.invalid" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const large = await request.post("/api/generate", {
    data: { title: "x".repeat(13000) },
  });
  expect(large.status(), await large.text()).toBe(413);
  const invalid = await request.post("/api/generate", { data: {} });
  expect(invalid.status()).toBe(400);
  expect(await invalid.text()).not.toContain("GEMINI_API_KEY");
});
test("event titles are escaped and full print output includes every planning section", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an event", exact: true })
    .first()
    .click();
  const title = "<img src=x onerror=alert(1)>";
  await page.getByLabel("Event name", { exact: true }).fill(title);
  await page.getByLabel("City or location").fill("Jaipur");
  await page.getByRole("button", { name: "Create my event" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  expect(await page.locator("img[onerror]").count()).toBe(0);
  await page.emulateMedia({ media: "print" });
  for (const name of [
    "Budget",
    "Preparation timeline",
    "Vendor checklist",
    "Event-day schedule",
    "Ideas for your event",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
});
