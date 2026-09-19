// Reads the JWT payload WITHOUT verifying it: a client cannot validate the signature and
// the server alone decides acceptance. The values are integrity hints only — `id` may
// reject a mismatched token, `exp` may deny an already-passed one, neither ever grants.
// The role claim key is not recorded, so a role is never read from the token.
export type TokenHints = Readonly<{ id?: string; exp?: number }>;

function decodeBase64Url(segment: string): string {
  const base64 = segment.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readTokenHints(token: string): TokenHints {
  const segments = token.split('.');
  if (segments.length !== 3 || !segments[1]) return {};
  let payload: unknown;
  try {
    payload = JSON.parse(decodeBase64Url(segments[1]));
  } catch {
    return {};
  }
  if (typeof payload !== 'object' || payload === null) return {};
  const { id, exp } = payload as Record<string, unknown>;
  return {
    ...(typeof id === 'string' && id.length > 0 && { id }),
    ...(typeof exp === 'number' && Number.isFinite(exp) && { exp }),
  };
}
