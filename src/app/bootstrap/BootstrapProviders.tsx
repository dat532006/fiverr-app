import type { PropsWithChildren } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '../../shared/ui/theme/ThemeProvider';

type BootstrapProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function BootstrapProviders({ queryClient, children }: BootstrapProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
