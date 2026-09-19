// Local fixture launcher only. A person operates the browser and records the verdict.
// Start the synthetic production preview on 127.0.0.1:4173 before running this file.
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

const width = Number(argv[2] ?? 390);
const scenario = argv[3] ?? 'guest';
const scenarios = ['guest', 'reject', 'restoring', 'failed-restore', 'memory-only'];
if (![390, 1440].includes(width) || !scenarios.includes(scenario)) {
  throw new Error(
    'Usage: node tests/manual/task-013-keyboard.mjs <390|1440> <guest|reject|restoring|failed-restore|memory-only>',
  );
}
const origin = 'http://127.0.0.1:4173';
const token = `${Buffer.from('{"alg":"none","typ":"SYNTHETIC"}').toString('base64url')}.${Buffer.from('{"synthetic":true,"id":"4242"}').toString('base64url')}.synthetic-not-a-signature`;
const user = { id: 4242, name: 'Người Dùng Thử', role: 'USER' };
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width, height: 900 },
  serviceWorkers: 'block',
});
const page = await context.newPage();
let releaseAdmission;
const admission = new Promise((resolve) => {
  releaseAdmission = resolve;
});
const unexpected = [];

// No remote request can reach the network, including fonts and unexpected navigations.
await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin === origin) return route.continue();
  if (url.origin !== 'https://fiverrnew.cybersoft.edu.vn') return route.abort();
  if (url.pathname === '/api/cong-viec/lay-menu-loai-cong-viec') {
    return route.fulfill({ json: { statusCode: 200, content: [] } });
  }
  if (url.pathname === '/api/auth/signin' && request.method() === 'POST') {
    return scenario === 'reject'
      ? route.fulfill({ status: 401, json: { statusCode: 401, content: 'synthetic rejection' } })
      : route.fulfill({ json: { statusCode: 200, content: { user, token } } });
  }
  if (url.pathname === '/api/thue-cong-viec/lay-danh-sach-da-thue') {
    if (scenario === 'restoring') await admission;
    return scenario === 'failed-restore'
      ? route.fulfill({ status: 403, json: { statusCode: 403, content: 'synthetic failure' } })
      : route.fulfill({ json: { statusCode: 200, content: [] } });
  }
  if (url.pathname === '/api/users/4242') {
    return route.fulfill({ json: { statusCode: 200, content: user } });
  }
  unexpected.push(`${request.method()} ${url.pathname}`);
  return route.abort();
});

await page.addInitScript(
  ({ scenario, token }) => {
    if (['restoring', 'failed-restore'].includes(scenario)) {
      globalThis.sessionStorage.setItem(
        'servio-session',
        JSON.stringify({ v: 1, token, userId: 4242, role: 'USER' }),
      );
    }
    if (['memory-only', 'failed-restore'].includes(scenario)) {
      const original = globalThis.Storage.prototype.setItem;
      globalThis.Storage.prototype.setItem = function (key, value) {
        if (key === 'servio-session')
          throw new globalThis.DOMException('synthetic quota', 'QuotaExceededError');
        original.call(this, key, value);
      };
    }
  },
  { scenario, token },
);

await page.goto(`${origin}/login?returnTo=%2Fjob%2F7`);
const input = createInterface({ input: stdin, output: stdout });
stdout.write(
  `Manual fixture: ${width}px, ${scenario}. Use only synthetic input: thu@example.invalid / synthetic-typed-secret.\n`,
);
if (scenario === 'restoring') {
  await input.question(
    'Inspect the restoring header with the keyboard, then press Enter here to release E50.\n',
  );
  releaseAdmission();
}
await input.question(
  'Operate the browser manually. Press Enter here when finished to close it. No PASS is recorded automatically.\n',
);
stdout.write(`Unexpected mocked API paths: ${JSON.stringify(unexpected)}\n`);
input.close();
await browser.close();
