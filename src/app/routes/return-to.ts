import { LOGIN_PATH } from './paths';

const FALLBACK = '/';
const REGISTER_PATH = '/register';
const MAX_LENGTH = 2048;
const PARSE_BASE = 'https://return-to.invalid';

// Browsers strip tabs and newlines from URLs, so `/\t/evil.example` would become a
// protocol-relative URL. Control characters and backslashes are never part of a route.
function hasForbiddenCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f || character === '\\') return true;
  }
  return false;
}

function isAuthPath(pathname: string): boolean {
  const normalised = pathname.toLowerCase().replace(/\/+$/, '');
  return normalised === LOGIN_PATH || normalised === REGISTER_PATH;
}

// A post-sign-in destination is accepted only as a same-origin path with a single leading
// `/`: never `//host`, `/\host`, an absolute URL or `javascript:`, and never the login or
// register page itself (no loop). Anything else becomes `/`.
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return FALLBACK;
  if (!raw.startsWith('/') || raw.startsWith('//')) return FALLBACK;
  if (hasForbiddenCharacter(raw)) return FALLBACK;

  let parsed: URL;
  try {
    parsed = new URL(raw, PARSE_BASE);
  } catch {
    return FALLBACK;
  }
  if (parsed.origin !== PARSE_BASE || isAuthPath(parsed.pathname)) return FALLBACK;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
