import { QueryClient } from '@tanstack/react-query';

export function createBootstrapQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}
