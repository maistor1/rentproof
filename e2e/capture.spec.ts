import { expect, test } from "@playwright/test";
import { CHECKOUT_RENTAL, DONE_REPORT_ID, PHOTO_FILE, RETURN_RENTAL } from "./fixtures";
import { mockInspect, mockPhotoFiles, mockPhotoUpload, mockReview } from "./mockApi";

const TITLES = ["Front", "Rear", "Left side", "Right side", "Operator cab", "Attachment"];

test("check-out: six photos through the phone camera app", async ({ page }) => {
  const uploaded = await mockPhotoUpload(page);
  await page.goto(`/checkout/${CHECKOUT_RENTAL}`);
  await expect(page.getByText("1,240.5 h")).toBeVisible();
  await page.getByRole("button", { name: "Start check-out" }).click();

  for (const [i, title] of TITLES.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText(`${i} of 6 photos`, { exact: true })).toBeVisible();
    await page.getByLabel("Camera").setInputFiles(PHOTO_FILE);
    await page.getByRole("button", { name: "Use photo" }).click();
  }

  await expect(page.getByRole("heading", { name: "Checked out" })).toBeVisible();
  await expect(page.getByText("6 of 6 photos", { exact: true })).toBeVisible();
  expect(uploaded).toEqual(["front", "rear", "left_side", "right_side", "operator_cab", "attachment"]);
  await page.getByRole("link", { name: "Back to rentals" }).click();
  await expect(page).toHaveURL("/");
});

test("return: live ghost camera, retake loop, then the report", async ({ page }) => {
  await mockPhotoUpload(page);
  await mockPhotoFiles(page);
  await mockInspect(page, RETURN_RENTAL, [{ rear: "Too dark to compare" }, {}]);
  await page.goto(`/return/${RETURN_RENTAL}`);
  await expect(page.getByText("+37.5 h used")).toBeVisible();
  await page.getByRole("button", { name: "Start return check" }).click();

  // Chromium's fake device feeds the live view; the check-out photo sits on top.
  await expect(page.getByTestId("live-camera")).toBeVisible();
  for (const title of TITLES) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.getByRole("button", { name: "Take photo" }).click();
    await page.getByRole("button", { name: "Use photo" }).click();
  }

  await page.getByRole("button", { name: "Run damage check" }).click();
  await expect(page.getByRole("heading", { name: "Checking for damage" })).toBeVisible();
  await expect(page.getByText(/usually 10 to 30 s/)).toBeVisible();

  await expect(page.getByTestId("retake-reason")).toHaveText("Retake: Too dark to compare");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rear");
  await page.getByRole("button", { name: "Take photo" }).click();
  await page.getByRole("button", { name: "Use photo" }).click();

  await page.getByRole("button", { name: "Run damage check again" }).click();
  await expect(page).toHaveURL(/\/report\/RPT-E2E-2$/);

  // RP-12: decide the uncertain finding, the total follows.
  await mockReview(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Damage report");
  await expect(page.getByText("dirt on the left track")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review 1 finding first" })).toBeDisabled();
  await page.getByRole("button", { name: "Confirm damage" }).click();
  await expect(page.getByText("Confirmed, charged")).toBeVisible();
  await expect(page.getByTestId("invoice-total")).toHaveText("€45.00");
  await expect(page.getByRole("link", { name: "Open customer evidence" })).toBeVisible();
});

test("return is blocked until check-out photos exist", async ({ page }) => {
  await page.goto(`/return/${CHECKOUT_RENTAL}`);
  await expect(page.getByRole("heading", { name: "Check-out photos missing" })).toBeVisible();
  await page.getByRole("link", { name: "Go to check-out" }).click();
  await expect(page).toHaveURL(`/checkout/${CHECKOUT_RENTAL}`);
});

test("report to customer evidence, ready to print", async ({ page }) => {
  await mockPhotoFiles(page);
  await page.goto(`/report/${DONE_REPORT_ID}`);
  await page.getByRole("link", { name: "Open customer evidence" }).click();
  await expect(page).toHaveURL(`/evidence/${DONE_REPORT_ID}`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Damage evidence");
  await expect(page.getByTestId("evidence-F-E2E-A")).toBeVisible();
  await expect(page.getByTestId("evidence-total")).toHaveText("€45.00");
  await expect(page.getByText(/Staff decided not to charge/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
});
