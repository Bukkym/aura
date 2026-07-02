// Captures PNGs of the onboarding flow for the Miro boards (Ex 19/20/21).
// Drives a running dev server with Playwright and saves screens to
// exercise-screenshots/. Run with `npm run shot:onboarding` (starts its own
// server is NOT handled here; point it at a running server via BASE_URL, default
// http://localhost:3000).
//
// The voice screen is captured at rest ("tap to speak"); we never tap the ring,
// so no mic permission is needed.

import { chromium } from "playwright";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = join(process.cwd(), "exercise-screenshots");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 920 },
    deviceScaleFactor: 2, // crisp PNGs for the board
  });
  const page = await ctx.newPage();

  const shot = (name: string) => page.screenshot({ path: join(OUT, name) });

  await page.goto(BASE, { waitUntil: "networkidle" });

  // Hide the Next.js dev-tools indicator so the board images are clean.
  await page.addStyleTag({
    content: "nextjs-portal,[data-nextjs-dev-tools-button]{display:none !important;}",
  });

  // Welcome -> Entry
  await page.getByRole("button", { name: /begin/i }).click();
  await page.getByRole("button", { name: /talk to ora/i }).waitFor();
  await shot("19-21-onboarding-entry.png");

  // Entry -> Voice (the Phase 4 hero screen), captured at rest
  await page.getByRole("button", { name: /talk to ora/i }).click();
  await page.getByText(/tap to speak/i).waitFor();
  await page.waitForTimeout(300);
  await shot("19-21-onboarding-voice.png");

  // Back to Entry -> Chips (the prefill / confirm-edit surface)
  await page.getByRole("button", { name: /back/i }).click();
  await page.getByRole("button", { name: /tap through/i }).click();
  await page.getByText(/pick the words that feel like you/i).waitFor();
  await page.waitForTimeout(300);
  await shot("19-21-onboarding-chips.png");

  await browser.close();
  console.log("Saved onboarding screenshots to exercise-screenshots/:");
  console.log("  - 19-21-onboarding-entry.png");
  console.log("  - 19-21-onboarding-voice.png");
  console.log("  - 19-21-onboarding-chips.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
