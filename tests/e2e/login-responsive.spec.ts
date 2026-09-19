import { expect, test, type Locator, type Page } from '@playwright/test';

// Hermetic run (TASK-013 T23): `npm run build` with overridden, non-secret, synthetic VITE_*
// values so the bundle never depends on `.env.local`, then `npm run preview` in a separate
// terminal (port 4173, matching playwright.config.ts), then
// `npm run test:e2e -- login-responsive`. Every request to the CyberSoft host is
// intercepted below and fulfilled from fixtures in this file: no request reaches the
// network, and no real credential or token appears anywhere.
//
//   VITE_APP_ENV=production VITE_API_BASE_URL=https://fiverrnew.cybersoft.edu.vn \
//   VITE_CYBERSOFT_TOKEN=e2e-hermetic-placeholder npm run build

const WIDTHS = [320, 390, 768, 1024, 1440] as const;

const USER_ID = 4242;
const DISPLAY_NAME = 'Người Dùng Thử';
const LONG_NAME =
  'Nguyễn Thị Phương Thảo Trần Lê Hoàng Minh Khánh Vy Đặng Bảo Ngọc Quỳnh Anh Thiên Kim';
const EMAIL = 'thu@example.invalid';
const PASSWORD = 'synthetic-typed-secret';

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

// A plainly synthetic three-segment token: the signature segment is not a signature.
const USER_TOKEN = `${base64Url('{"alg":"none","typ":"SYNTHETIC"}')}.${base64Url(
  JSON.stringify({ synthetic: true, id: String(USER_ID) }),
)}.synthetic-not-a-signature`;

type MockOptions = Readonly<{
  signin?: 'ok' | 'reject';
  // 'ok' admits; 'forbidden' answers 403 (restore-unavailable); 'slow' delays the answer.
  restore?: 'ok' | 'forbidden' | 'slow';
  name?: string;
  signinDelayMs?: number;
}>;

function userRecord(name: string) {
  return {
    id: USER_ID,
    name,
    email: EMAIL,
    password: 'synthetic-password-field',
    phone: '0900000000',
    birthday: '2000-01-01',
    avatar: '',
    gender: true,
    role: 'USER',
    skill: [],
    certification: [],
    bookingJob: [],
  };
}

async function installHermeticCyberSoftMock(page: Page, options: MockOptions = {}) {
  const { signin = 'ok', restore = 'ok', name = DISPLAY_NAME, signinDelayMs = 0 } = options;
  const unexpectedRequests: string[] = [];
  const seen: string[] = [];
  // A final network boundary also blocks unexpected external navigation (F01), fonts,
  // and any host outside the mocked API. Only the local preview may reach the network.
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:4173') {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  await page.route('**cybersoft.edu.vn/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    seen.push(`${request.method()} ${url.pathname}`);

    if (url.pathname.endsWith('/lay-menu-loai-cong-viec')) {
      await route.fulfill({ json: { statusCode: 200, content: [] } });
      return;
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/api/auth/signin')) {
      if (signinDelayMs) await new Promise((done) => setTimeout(done, signinDelayMs));
      if (signin === 'reject') {
        await route.fulfill({ status: 401, json: { statusCode: 401, content: 'synthetic' } });
        return;
      }
      await route.fulfill({
        json: { statusCode: 200, content: { user: userRecord(name), token: USER_TOKEN } },
      });
      return;
    }
    if (url.pathname.endsWith('/lay-danh-sach-da-thue')) {
      if (request.headers()['token'] !== USER_TOKEN || restore === 'forbidden') {
        await route.fulfill({ status: 403, json: { statusCode: 403, content: 'forbidden' } });
        return;
      }
      if (restore === 'slow') await new Promise((done) => setTimeout(done, 1500));
      await route.fulfill({ json: { statusCode: 200, content: [] } });
      return;
    }
    if (url.pathname.endsWith(`/api/users/${USER_ID}`)) {
      await route.fulfill({ json: { statusCode: 200, content: userRecord(name) } });
      return;
    }
    unexpectedRequests.push(`${request.method()} ${request.url()}`);
    await route.fulfill({ status: 500, body: 'Unexpected CyberSoft request in hermetic E2E test' });
  });
  return { unexpectedRequests, seen };
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error('Element has no box (not visible?)');
  return result;
}

// Bounded real Tab walk (mirrors search-responsive): proves keyboard reachability rather
// than `element.focus()`, which only proves DOM focus is possible.
const MAX_TAB_ATTEMPTS = 25;

async function tabTo(page: Page, target: Locator) {
  for (let attempt = 0; attempt < MAX_TAB_ATTEMPTS; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Element was not reachable within ${MAX_TAB_ATTEMPTS} Tab presses`);
}

async function fillAndSubmit(page: Page) {
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('main').getByRole('button', { name: 'Đăng nhập' }).click();
}

const boxShadow = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).boxShadow);

test.describe('review regressions', () => {
  for (const memoryOnly of [false, true]) {
    for (const target of [
      '/a/..//review-target.invalid',
      '/%6cogin',
      '/job/7?q=a%2Fb#part%20one',
    ]) {
      test(`safe navigation, memory-only=${memoryOnly}, target=${target}`, async ({ page }) => {
        const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
        const escaped: string[] = [];
        page.on('request', (request) => {
          if (
            request.isNavigationRequest() &&
            new URL(request.url()).origin !== 'http://127.0.0.1:4173'
          )
            escaped.push(request.url());
        });
        if (memoryOnly)
          await page.addInitScript(() => {
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
              if (key === 'servio-session')
                throw new DOMException('synthetic quota', 'QuotaExceededError');
              original.call(this, key, value);
            };
          });
        const arrival = `/login?returnTo=${encodeURIComponent(target)}`;
        const destination = target.startsWith('/job/') ? target : '/';
        await page.goto(arrival);
        await fillAndSubmit(page);
        if (memoryOnly) {
          await expect(page.getByText('Đã đăng nhập.')).toBeVisible();
          await expect(page).toHaveURL(`http://127.0.0.1:4173${arrival}`);
          const continuation = page.getByRole('link', { name: 'Tiếp tục' });
          await expect(continuation).toHaveAttribute('href', destination);
          await continuation.click();
        }
        await expect(page).toHaveURL(`http://127.0.0.1:4173${destination}`);
        await expect(
          page.getByRole('banner').getByRole('button', { name: DISPLAY_NAME }),
        ).toBeVisible();
        expect(escaped).toEqual([]);
        expect(unexpectedRequests).toEqual([]);
      });
    }
  }

  test('failed restore then memory-only sign-in waits for explicit continuation', async ({
    page,
  }) => {
    const { unexpectedRequests, seen } = await installHermeticCyberSoftMock(page, {
      restore: 'forbidden',
    });
    await page.addInitScript(
      ({ token, userId }) => {
        sessionStorage.setItem(
          'servio-session',
          JSON.stringify({ v: 1, token, userId, role: 'USER' }),
        );
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'servio-session')
            throw new DOMException('synthetic quota', 'QuotaExceededError');
          original.call(this, key, value);
        };
      },
      { token: USER_TOKEN, userId: USER_ID },
    );
    await page.goto('/login?returnTo=%2Fjob%2F7');
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    await fillAndSubmit(page);
    await expect(page.getByText('Đã đăng nhập.')).toBeVisible();
    await expect(
      page.getByText(
        'Trình duyệt không cho lưu phiên đăng nhập. Phiên chỉ giữ đến khi bạn tải lại hoặc đóng trang.',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fjob%2F7$/);
    await page.getByRole('link', { name: 'Tiếp tục' }).click();
    await expect(page).toHaveURL(/\/job\/7$/);
    expect(seen).toEqual([
      'GET /api/thue-cong-viec/lay-danh-sach-da-thue',
      'POST /api/auth/signin',
    ]);
    expect(unexpectedRequests).toEqual([]);
  });
});

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    test('/login has no horizontal overflow, focuses the h1, and has full-size targets', async ({
      page,
    }) => {
      const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
      await page.goto('/login');

      const heading = page.getByRole('heading', { level: 1, name: 'Đăng nhập' });
      await expect(heading).toBeVisible();
      await expect(heading).toBeFocused();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Mật khẩu')).toBeVisible();
      await expect(
        page.getByText('Chưa hỗ trợ đăng nhập bằng mạng xã hội hoặc khôi phục mật khẩu.'),
      ).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

      for (const control of [
        page.getByLabel('Email'),
        page.getByLabel('Mật khẩu'),
        page.getByRole('main').getByRole('button', { name: 'Đăng nhập' }),
      ]) {
        expect((await box(control)).height).toBeGreaterThanOrEqual(44);
      }
      // Single column, full-width controls at phone widths.
      if (width <= 390) {
        const formBox = await box(page.locator('main form'));
        expect((await box(page.getByLabel('Email'))).width).toBeGreaterThanOrEqual(
          formBox.width - 1,
        );
      }
      expect(unexpectedRequests).toEqual([]);
    });

    test('the sign-in button keeps its width while pending', async ({ page }) => {
      const { unexpectedRequests } = await installHermeticCyberSoftMock(page, {
        signinDelayMs: 600,
      });
      await page.goto('/login');
      const submit = page.getByRole('main').getByRole('button', { name: 'Đăng nhập' });
      const before = await box(submit);
      await page.getByLabel('Email').fill(EMAIL);
      await page.getByLabel('Mật khẩu').fill(PASSWORD);
      await submit.click();

      const pending = page.getByRole('button', { name: 'Đang đăng nhập…' });
      await expect(pending).toBeDisabled();
      const during = await box(pending);
      expect(Math.abs(during.width - before.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(during.height - before.height)).toBeLessThanOrEqual(1);
      await expect(page).toHaveURL(/\/$/);
      expect(unexpectedRequests).toEqual([]);
    });

    test('a rejected sign-in shows one wrapped summary with no overflow and keeps the values', async ({
      page,
    }) => {
      const { unexpectedRequests } = await installHermeticCyberSoftMock(page, {
        signin: 'reject',
      });
      await page.goto('/login');
      await fillAndSubmit(page);

      const summary = page.getByRole('alert');
      await expect(summary).toContainText('Đăng nhập không thành công. Vui lòng thử lại.');
      await expect(summary).toBeFocused();
      await expect(page.getByLabel('Email')).toHaveValue(EMAIL);
      await expect(page.getByLabel('Mật khẩu')).toHaveValue(PASSWORD);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      expect(unexpectedRequests).toEqual([]);
    });

    test('the header is usable in all three session states with no overflow', async ({ page }) => {
      const { unexpectedRequests } = await installHermeticCyberSoftMock(page, {
        restore: 'slow',
        name: LONG_NAME,
      });
      const header = page.getByRole('banner');
      const themeToggle = header.getByRole('button', { name: /giao diện/ });
      const insideViewport = async () => {
        const toggle = await box(themeToggle);
        expect(toggle.x).toBeGreaterThanOrEqual(0);
        expect(toggle.x + toggle.width).toBeLessThanOrEqual(width + 1);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      };

      // 1. Guest.
      await page.goto('/login');
      await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Đăng ký' })).toBeVisible();
      await insideViewport();

      // 2. Authenticated with a very long Vietnamese name.
      await fillAndSubmit(page);
      const account = header.getByRole('button', { name: LONG_NAME });
      await expect(account).toBeVisible();
      expect((await box(account)).height).toBeGreaterThanOrEqual(44);
      await expect(account).toHaveAttribute('aria-expanded', 'false');
      await insideViewport();
      // The name is far longer than the control, so it is cut visually at every width; the
      // full name stays available as the accessible name (asserted by the locator above).
      const label = account.locator('span').first();
      expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
        true,
      );
      expect((await box(account)).width).toBeLessThanOrEqual(width - 32 + 1);
      await account.click();
      const signOut = header.getByRole('button', { name: 'Đăng xuất' });
      await expect(signOut).toBeVisible();
      expect((await box(signOut)).height).toBeGreaterThanOrEqual(44);
      const panelBox = await box(signOut);
      expect(panelBox.x).toBeGreaterThanOrEqual(0);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width + 1);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');

      // 3. Restoring: reload keeps the tab's session; the slow admission leaves the neutral
      // placeholder up, with no guest links and no account control.
      await page.reload();
      const placeholder = header.locator('[aria-busy="true"]');
      await expect(placeholder).toBeVisible();
      await expect(header.getByRole('link', { name: 'Đăng nhập' })).toHaveCount(0);
      await expect(header.getByRole('link', { name: 'Đăng ký' })).toHaveCount(0);
      await expect(header.getByRole('button', { name: LONG_NAME })).toHaveCount(0);
      await insideViewport();
      await expect(header.getByRole('button', { name: LONG_NAME })).toBeVisible({ timeout: 5000 });
      expect(unexpectedRequests).toEqual([]);
    });

    test('a restore that cannot finish shows the wrapped notice with "Thử lại"', async ({
      page,
    }) => {
      const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
      await page.goto('/login');
      await fillAndSubmit(page);
      await expect(
        page.getByRole('banner').getByRole('button', { name: DISPLAY_NAME }),
      ).toBeVisible();

      // The next load cannot be admitted (403): the snapshot is kept, the notice is shown.
      await page.unroute('**cybersoft.edu.vn/**');
      const second = await installHermeticCyberSoftMock(page, { restore: 'forbidden' });
      await page.goto('/login');
      await expect(
        page.getByText(
          'Chưa khôi phục được phiên đăng nhập. Bạn có thể thử lại hoặc đăng nhập lại.',
        ),
      ).toBeVisible();
      const retry = page.getByRole('button', { name: 'Thử lại' });
      await expect(retry).toBeVisible();
      expect((await box(retry)).height).toBeGreaterThanOrEqual(44);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      expect(unexpectedRequests).toEqual([]);
      expect(second.unexpectedRequests).toEqual([]);
    });
  });
}

test.describe('keyboard and focus', () => {
  test('the sign-in fields and button are reached by a real Tab walk, each with a visible focus indicator', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const { unexpectedRequests } = await installHermeticCyberSoftMock(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeFocused();

    const email = page.getByLabel('Email');
    const password = page.getByLabel('Mật khẩu');
    const submit = page.getByRole('main').getByRole('button', { name: 'Đăng nhập' });

    const emailBefore = await boxShadow(email);
    await tabTo(page, email);
    await expect(email).toBeFocused();
    const emailAfter = await boxShadow(email);
    expect(emailAfter).not.toBe('none');
    expect(emailAfter).not.toBe(emailBefore);

    const passwordBefore = await boxShadow(password);
    await tabTo(page, password);
    await expect(password).toBeFocused();
    const passwordAfter = await boxShadow(password);
    expect(passwordAfter).not.toBe('none');
    expect(passwordAfter).not.toBe(passwordBefore);

    // The unchanged Button relies on the browser's default outline for keyboard focus.
    await tabTo(page, submit);
    await expect(submit).toBeFocused();
    const outline = await submit.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);

    // Enter on the keyboard-focused button submits the form and signs in.
    await email.focus();
    await email.fill(EMAIL);
    await password.fill(PASSWORD);
    await tabTo(page, submit);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('banner').getByRole('button', { name: DISPLAY_NAME }),
    ).toBeVisible();
    expect(unexpectedRequests).toEqual([]);
  });

  test('client validation puts focus on the first invalid field and marks it for assistive tech', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { unexpectedRequests, seen } = await installHermeticCyberSoftMock(page);
    await page.goto('/login');
    await page.getByRole('main').getByRole('button', { name: 'Đăng nhập' }).click();

    const email = page.getByLabel('Email');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Vui lòng nhập email.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập mật khẩu.')).toBeVisible();
    expect(seen.filter((entry) => entry.startsWith('POST'))).toEqual([]);
    expect(unexpectedRequests).toEqual([]);
  });

  test('the account panel: Escape and outside click close it and return focus; Đăng xuất signs out', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { unexpectedRequests, seen } = await installHermeticCyberSoftMock(page);
    await page.goto('/login');
    await fillAndSubmit(page);

    const header = page.getByRole('banner');
    const account = header.getByRole('button', { name: DISPLAY_NAME });
    await expect(account).toBeVisible();

    // Reach the account button by a real Tab walk from the top of the page.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const before = await boxShadow(account);
    await tabTo(page, account);
    await expect(account).toBeFocused();
    const after = await boxShadow(account);
    expect(after).not.toBe('none');
    expect(after).not.toBe(before);

    await page.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    const signOut = header.getByRole('button', { name: 'Đăng xuất' });
    await expect(signOut).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(signOut).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toBeFocused();
    await expect(signOut).toBeHidden();

    // Outside click on empty page space closes it and returns focus to the button.
    await page.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.click(10, 500);
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toBeFocused();

    // Sign out by keyboard: guest links at once, focus on "Đăng nhập", no request sent.
    const requestsBefore = seen.length;
    await page.keyboard.press('Enter');
    await tabTo(page, signOut);
    await page.keyboard.press('Enter');
    const signIn = header.getByRole('link', { name: 'Đăng nhập' });
    await expect(signIn).toBeVisible();
    await expect(signIn).toBeFocused();
    await expect(header.getByRole('link', { name: 'Đăng ký' })).toBeVisible();
    await expect(page.getByText('Đã đăng xuất.')).toHaveCount(1);
    await expect(header.getByRole('button', { name: DISPLAY_NAME })).toHaveCount(0);
    expect(seen.length).toBe(requestsBefore);

    // The tab no longer restores the old session after a reload.
    await page.reload();
    await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    expect(await page.evaluate(() => window.sessionStorage.getItem('servio-session'))).toBeNull();
    expect(unexpectedRequests).toEqual([]);
  });

  test('a reload restores the signed-in header only after E50 and E39 admit the token', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    const { unexpectedRequests, seen } = await installHermeticCyberSoftMock(page);
    await page.goto('/login');
    await fillAndSubmit(page);
    await expect(
      page.getByRole('banner').getByRole('button', { name: DISPLAY_NAME }),
    ).toBeVisible();
    seen.length = 0;

    await page.reload();
    await expect(
      page.getByRole('banner').getByRole('button', { name: DISPLAY_NAME }),
    ).toBeVisible();
    expect(seen.filter((entry) => !entry.includes('lay-menu-loai-cong-viec'))).toEqual([
      'GET /api/thue-cong-viec/lay-danh-sach-da-thue',
      `GET /api/users/${USER_ID}`,
    ]);
    expect(unexpectedRequests).toEqual([]);
  });
});
