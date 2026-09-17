import { expect, test } from '@playwright/test';

// Manual run only: `npm run build && npm run preview` in a separate terminal
// (port 4173, matching playwright.config.ts's baseURL), then `npm run test:e2e`.
// Not executed as part of TASK-009 local validation — it exercises the live
// preview build against the real CyberSoft API via .env.local, which the
// TASK-009 live-API boundary forbids. jsdom/RTL cannot compute real CSS
// layout, so the 320/390/768/1024/1440px requirement is verified here rather
// than in the Vitest suite (mirrors tests/e2e/home-responsive.spec.ts).
const WIDTHS = [320, 390, 768, 1024, 1440] as const;

for (const width of WIDTHS) {
  test(`Search has no page-level horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/search?q=logo');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('search submit button is a touch-sized target at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/search');
  const submit = page.getByRole('button', { name: 'Tìm kiếm' });
  const box = await submit.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('long Vietnamese search text stays usable in the search box at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/search');
  const longTerm = 'dịch vụ thiết kế đồ họa chuyên nghiệp cho doanh nghiệp vừa và nhỏ';
  const input = page.getByRole('searchbox');
  await input.fill(longTerm);
  await expect(input).toHaveValue(longTerm);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('result grid shows multiple columns at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/search?q=logo');
  const region = page.getByLabel(/Kết quả tìm kiếm/);
  const cards = region.getByRole('link');
  const count = await cards.count();
  test.skip(count < 2, 'No jobs returned by the live API in this environment.');
  const [firstBox, secondBox] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(firstBox?.y).toBe(secondBox?.y);
});
