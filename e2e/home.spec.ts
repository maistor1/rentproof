import { expect, test } from "@playwright/test";
import { CHECKOUT_RENTAL, DONE_REPORT_ID, RETURN_RENTAL } from "./fixtures";

test("home: each rental offers its next step", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Rentals" })).toBeVisible();
  await expect(page.locator(`a[href="/checkout/${CHECKOUT_RENTAL}"]`)).toHaveText("Take check-out photos");
  await expect(page.locator(`a[href="/return/${RETURN_RENTAL}"]`)).toHaveText("Start return");
  await expect(page.getByRole("link", { name: "New rental" })).toBeVisible();
});

test("new rental: the form creates a rental and opens its check-out", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "New rental" }).click();
  await expect(page.getByRole("heading", { name: "New rental" })).toBeVisible();
  await expect(page.getByLabel(/hour/i)).toHaveCount(0);

  await page.getByLabel("Machine name").fill("Tracked dumper (e2e)");
  await page.getByLabel("Model").fill("Wacker DT10");
  await page.getByLabel("Serial number").fill("E2E-DT10-1");
  await page.getByLabel("Customer name").fill("Erdbau e2e");
  await page.getByLabel("Customer email").fill("e2e@erdbau.example");
  await page.getByRole("button", { name: "Create and take check-out photos" }).click();

  await expect(page).toHaveURL(/\/checkout\/R-[a-z0-9]{8}$/);
  await expect(page.getByRole("heading", { name: "Tracked dumper (e2e)" })).toBeVisible();
  await expect(page.getByText("Erdbau e2e")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tracked dumper (e2e)" })).toBeVisible();
});

test("home: an inspected rental links to its report and evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(`a[href="/report/${DONE_REPORT_ID}"]`)).toHaveText("Open report");
  await expect(page.locator(`a[href="/evidence/${DONE_REPORT_ID}"]`)).toHaveText("Customer evidence");
});
