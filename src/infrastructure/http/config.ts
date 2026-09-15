export class ConfigurationError extends Error {
  constructor() {
    super('Cấu hình kết nối chưa hợp lệ.');
    this.name = 'ConfigurationError';
  }
}

export type ApiConfig = Readonly<{
  baseUrl: string;
  origin: string;
  cybersoftToken: string;
  appEnvironment: 'development' | 'preview' | 'production';
}>;

export function readApiConfig(input: unknown, allowedOrigins: readonly string[]): ApiConfig {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('VITE_API_BASE_URL' in input) ||
    !('VITE_CYBERSOFT_TOKEN' in input) ||
    !('VITE_APP_ENV' in input)
  ) {
    throw new ConfigurationError();
  }

  const baseUrl = input.VITE_API_BASE_URL;
  const cybersoftToken = input.VITE_CYBERSOFT_TOKEN;
  const appEnvironment = input.VITE_APP_ENV;
  if (
    typeof baseUrl !== 'string' ||
    typeof cybersoftToken !== 'string' ||
    !cybersoftToken.trim() ||
    (appEnvironment !== 'development' &&
      appEnvironment !== 'preview' &&
      appEnvironment !== 'production')
  ) {
    throw new ConfigurationError();
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new ConfigurationError();
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !allowedOrigins.includes(url.origin)
  ) {
    throw new ConfigurationError();
  }

  return Object.freeze({
    baseUrl: url.href,
    origin: url.origin,
    cybersoftToken,
    appEnvironment,
  });
}
