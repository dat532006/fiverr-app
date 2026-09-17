import { expect, test, type Page } from '@playwright/test';

// Hermetic run: `npm run build` with an overridden (non-secret, synthetic)
// VITE_* env so the bundle never depends on `.env.local`, then
// `npm run preview` in a separate terminal (port 4173, matching
// playwright.config.ts's baseURL), then `npm run test:e2e -- search-responsive`.
// Every request to the CyberSoft host is intercepted below and fulfilled from
// the fixtures in this file — the real token value in `.env.local` (if any)
// is never read by this test and never leaves the browser, because the
// request is short-circuited before it reaches the network. jsdom/RTL cannot
// compute real CSS layout, so the 320/390/768/1024/1440px requirement is
// verified here rather than in the Vitest suite (mirrors
// tests/e2e/home-responsive.spec.ts).
//
// Example hermetic build (values are placeholders, not real credentials):
//   VITE_APP_ENV=production VITE_API_BASE_URL=https://fiverrnew.cybersoft.edu.vn \
//   VITE_CYBERSOFT_TOKEN=e2e-hermetic-placeholder npm run build

const WIDTHS = [320, 390, 768, 1024, 1440] as const;

const SEARCH_JOBS_PATH = '/lay-danh-sach-cong-viec-theo-ten/';
const TAXONOMY_MENU_PATH = '/lay-menu-loai-cong-viec';

function mockJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    tenCongViec: 'Job',
    danhGia: 8,
    giaTien: 150000,
    nguoiTao: 1,
    hinhAnh: '',
    moTa: 'Mô tả đầy đủ',
    maChiTietLoaiCongViec: 900003,
    moTaNgan: 'Mô tả ngắn',
    saoCongViec: 4,
    ...overrides,
  };
}

// Confirmed live E28 content[] shape: a ViewModel wrapper around `congViec`,
// plus seller/category display metadata the application does not use.
function mockWrapperItem(overrides: Partial<Record<string, unknown>> = {}) {
  return { congViec: mockJob(overrides) };
}

// Four distinct jobs so the desktop multi-column assertion below is
// deterministic and never needs a live-result-count `test.skip`.
const MOCK_JOBS = [
  mockWrapperItem({ id: 1, tenCongViec: 'Thiết kế logo thương hiệu' }),
  mockWrapperItem({ id: 2, tenCongViec: 'Viết nội dung quảng cáo' }),
  mockWrapperItem({ id: 3, tenCongViec: 'Dựng video giới thiệu' }),
  mockWrapperItem({ id: 4, tenCongViec: 'Thiết kế banner mạng xã hội' }),
];

// Installs a host-wide interception for the CyberSoft API so this spec makes
// zero real requests to it. Any request under that host which isn't one of
// TASK-009's two known reads is treated as unexpected and recorded — callers
// assert `unexpectedRequests` is empty instead of letting it silently escape.
async function installHermeticCyberSoftMock(page: Page): Promise<{ unexpectedRequests: string[] }> {
  const unexpectedRequests: string[] = [];
  await page.route('**cybersoft.edu.vn/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes(SEARCH_JOBS_PATH)) {
      await route.fulfill({ json: { statusCode: 200, content: MOCK_JOBS } });
      return;
    }
    if (url.pathname.includes(TAXONOMY_MENU_PATH)) {
      await route.fulfill({ json: { statusCode: 200, content: [] } });
      return;
    }
    unexpectedRequests.push(route.request().url());
    await route.fulfill({ status: 500, body: 'Unexpected CyberSoft request in hermetic E2E test' });
  });
  return { unexpectedRequests };
}

// Bounded real Tab-key walk to the search input — proves keyboard
// reachability without assuming the input is first in global tab order and
// without hard-coding how many hops the surrounding chrome takes.
const MAX_TAB_ATTEMPTS = 25;

async function tabToSearchInput(page: Page) {
  const input = page.getByRole('searchbox');
  for (let attempt = 0; attempt < MAX_TAB_ATTEMPTS; attempt += 1) {
    await page.keyboard.press('Tab');
    const isFocused = await input.evaluate((element) => element === document.activeElement);
    if (isFocused) return input;
  }
  throw new Error(`Search input was not reachable within ${MAX_TAB_ATTEMPTS} Tab presses`);
}

for (const width of WIDTHS) {
  test(`search form and results stay usable with no horizontal scroll at ${width}px`, async ({
    page,
  }) => {
    const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/search?q=logo');

    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible();
    await expect(page.getByText('Thiết kế logo thương hiệu')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(unexpectedRequests).toEqual([]);
  });
}

test('search submit button is a touch-sized target at 390px', async ({ page }) => {
  const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/search');
  const submit = page.getByRole('button', { name: 'Tìm kiếm' });
  const box = await submit.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(unexpectedRequests).toEqual([]);
});

test('long Vietnamese search text stays usable and submits deterministic results at 320px', async ({
  page,
}) => {
  const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/search');
  const longTerm = 'dịch vụ thiết kế đồ họa chuyên nghiệp cho doanh nghiệp vừa và nhỏ';
  const input = page.getByRole('searchbox');
  await input.fill(longTerm);
  await expect(input).toHaveValue(longTerm);

  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page).toHaveURL(/[?&]q=/);
  await expect(page.getByText('Thiết kế logo thương hiệu')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(unexpectedRequests).toEqual([]);
});

test('search input is keyboard-reachable, shows a visible focus indicator, and submits via Enter', async ({
  page,
}) => {
  const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/search');

  const searchForm = page.getByRole('search');
  const boxShadowBeforeFocus = await searchForm.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );

  // A. Keyboard reachability — a bounded, real Tab walk from the top of the
  // page. Does not assume the search input is first in tab order and does
  // not use `input.focus()`, which would only prove DOM focus is possible,
  // not that a keyboard user can actually reach the control.
  const input = await tabToSearchInput(page);
  await expect(input).toBeFocused();

  // B. Visible focus — assert a real, observable computed-style delta on the
  // ring-bearing form container (not `toBeFocused()`, width, visibility, or
  // class-name presence, none of which prove a rendered indicator exists).
  const boxShadowAfterFocus = await searchForm.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  expect(boxShadowAfterFocus).not.toBe('none');
  expect(boxShadowAfterFocus).not.toBe(boxShadowBeforeFocus);

  // C. Existing behavior proof — the keyboard-reached input still submits.
  await input.pressSequentially('logo');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/[?&]q=logo/);
  await expect(page.getByText('Thiết kế logo thương hiệu')).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});

test('a result card navigates to its own job route (navigation affordance)', async ({ page }) => {
  const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/search?q=logo');

  const card = page.getByRole('link', { name: /Thiết kế logo thương hiệu/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/job\/1$/);
  expect(unexpectedRequests).toEqual([]);
});

test('result grid shows multiple columns at 1440px with deterministic mocked jobs', async ({
  page,
}) => {
  const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/search?q=logo');

  const region = page.getByLabel(/Kết quả tìm kiếm/);
  const cards = region.getByRole('link');
  await expect(cards).toHaveCount(MOCK_JOBS.length);
  const [firstBox, secondBox] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(firstBox?.y).toBe(secondBox?.y);
  expect(unexpectedRequests).toEqual([]);
});
