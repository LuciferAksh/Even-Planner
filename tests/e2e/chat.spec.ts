import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const proposal = {
  summary: "Add acoustic music and a simple setup task.",
  preferences:
    "Vegetarian food, step-free access, acoustic music and reusable decorations.",
  budgetMajor: null,
  guests: null,
  tasks: [
    { title: "Arrange an acoustic playlist", category: "Music", daysBefore: 7 },
  ],
};
async function openChat(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a wedding example" }).click();
  await page.getByRole("button", { name: "Chat with Gather" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test("chat remembers follow-ups, previews changes, applies preferences, and links to personalization", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/chat", async (route) => {
    const data = route.request().postDataJSON();
    calls++;
    if (calls === 1) {
      expect(data.context).not.toHaveProperty("paid");
      await route.fulfill({
        json: {
          response: {
            reply:
              "Acoustic music and reusable decorations could suit your garden celebration. Review the suggestion below.",
            proposal,
          },
        },
      });
    } else {
      expect(data.messages).toHaveLength(3);
      expect(data.context.brief.preferences).toContain("acoustic music");
      await route.fulfill({
        json: {
          response: {
            reply:
              "For the acoustic setup, ask about sound limits and keep seating accessible.",
            proposal: null,
          },
        },
      });
    }
  });
  await openChat(page);
  const composer = page.getByRole("textbox", { name: "Message Gather" });
  await composer.fill("I would love acoustic music and reusable decorations.");
  await composer.press("Enter");
  await expect(
    page.getByText(
      "Acoustic music and reusable decorations could suit your garden celebration. Review the suggestion below.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview plan changes" }).click();
  await expect(
    page.getByRole("region", { name: "Proposed plan changes" }),
  ).toContainText("Arrange an acoustic playlist");
  await page.getByRole("button", { name: "Apply to my plan" }).click();
  await expect(
    page.getByText("Changes applied", { exact: true }),
  ).toBeVisible();
  await composer.fill("What should I check about the sound setup?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText(
      "For the acoustic setup, ask about sound limits and keep seating accessible.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Personalize with these thoughts" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("A more personal plan.");
  await page.getByRole("button", { name: "Keep current plan" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Maya & Arjun’s wedding", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Chat with Gather" }).click();
  await expect(
    page.getByText("What should I check about the sound setup?", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("button", { name: "Timeline", exact: true })
    .click();
  await expect(
    page.getByText("Arrange an acoustic playlist", { exact: true }),
  ).toBeVisible();
});
test("chat failures preserve drafts and existing messages; clear needs confirmation", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/chat", (route) => {
    calls++;
    return route.fulfill({
      status: calls === 1 ? 200 : 429,
      json:
        calls === 1
          ? {
              response: {
                reply: "We can plan this one step at a time.",
                proposal: null,
              },
            }
          : { error: "Free-tier quota is busy. Try again later." },
    });
  });
  await openChat(page);
  const composer = page.getByRole("textbox", { name: "Message Gather" });
  await composer.fill("Help me get started");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("We can plan this one step at a time."),
  ).toBeVisible();
  await composer.fill("Keep this draft safe");
  await composer.press("Enter");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "quota",
  );
  await expect(composer).toHaveValue("Keep this draft safe");
  await expect(
    page.getByText("We can plan this one step at a time."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear chat", exact: true }).click();
  await page.getByRole("button", { name: "Keep messages" }).click();
  await expect(
    page.getByText("We can plan this one step at a time."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear messages", exact: true })
    .click();
  await expect(
    page.getByText("Let’s think it through, together."),
  ).toBeVisible();
});
test("conversation and preview are accessible and fit a mobile screen", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: {
        response: {
          reply: "Here is a suggestion to review.",
          proposal: { ...proposal, budgetMajor: "480000", guests: 100 },
        },
      },
    }),
  );
  await openChat(page);
  const scan = async () => {
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await scan();
  await page
    .getByRole("textbox", { name: "Message Gather" })
    .fill("Reduce the budget to 480000 and plan for 100 guests.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Preview plan changes" }).click();
  await scan();
  await page.setViewportSize({ width: 390, height: 844 });
  await scan();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chat with Gather" }),
  ).toBeFocused();
});
test("chat text is escaped and older proposals expire after a new exchange", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/chat", (route) => {
    calls++;
    return route.fulfill({
      json: {
        response: {
          reply:
            calls === 1
              ? "<img src=x onerror=alert(1)>"
              : "Let’s use your newest thoughts.",
          proposal: calls === 1 ? proposal : null,
        },
      },
    });
  });
  await openChat(page);
  const composer = page.getByRole("textbox", { name: "Message Gather" });
  await composer.fill("Suggest an activity");
  await composer.press("Enter");
  await expect(
    page.getByText("<img src=x onerror=alert(1)>", { exact: true }),
  ).toBeVisible();
  expect(await page.locator("img[onerror]").count()).toBe(0);
  await composer.fill("Let me think about something else");
  await composer.press("Enter");
  await expect(page.getByText("Let’s use your newest thoughts.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview plan changes" }),
  ).not.toBeVisible();
  await expect(page.getByText(/This proposal expired/)).toBeVisible();
});
