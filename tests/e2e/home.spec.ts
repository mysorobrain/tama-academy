import { expect, test } from "@playwright/test";

test("landing répond en français", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Tama Academy/);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "fr");

  await expect(page.getByRole("heading", { name: "Tama Academy", level: 1 })).toBeVisible();
});
