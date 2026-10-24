import { test, expect } from "@playwright/test";
test("a downloaded JSON backup imports as a separate event", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up this event" }).click();
  const downloaded = await pending;
  const path = await downloaded.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: /My events/ }).click();
  await page
    .getByLabel("Import event backup", { exact: true })
    .setInputFiles(path!);
  await expect(page.getByRole("status")).toHaveText(
    "Backup imported as separate events.",
  );
  await expect(
    page.getByRole("button", { name: /Maya & Arjun’s wedding/ }),
  ).toHaveCount(4);
});
test("scenario undo cannot discard edits made after applying the scenario", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await page
    .getByRole("button", { name: "Explore a different budget" })
    .click();
  await page.getByRole("button", { name: "Preview changes" }).click();
  await page.getByRole("button", { name: "Apply this scenario" }).click();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});
