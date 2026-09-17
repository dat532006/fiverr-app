import { expect, test } from '@playwright/test';

// Manual run: `npm run build && npm run preview` in a separate terminal (port
// 4173, matching playwright.config.ts's baseURL), then `npm run test:e2e`.
// jsdom/RTL cannot compute real CSS layout, so the 320/390/768/1024/1440px
// responsive requirement is verified here rather than in the Vitest suite.
const WIDTHS = [320, 390, 768, 1024, 1440] as const;

for (const width of WIDTHS) {
  test(`Home has no page-level horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('taxonomy trigger is a touch-sized target at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Danh mục/ });
  const box = await trigger.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('category grid shows multiple columns at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Danh mục công việc' });
  const cards = section.getByRole('link');
  const count = await cards.count();
  test.skip(count < 2, 'No categories returned by the live API in this environment.');
  const [firstBox, secondBox] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(firstBox?.y).toBe(secondBox?.y);
});
