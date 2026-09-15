import type { PropsWithChildren } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';

type BootstrapProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function BootstrapProviders({ queryClient, children }: BootstrapProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
