import type { PropsWithChildren } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '../../shared/ui/theme/ThemeProvider';
import { AppSessionProvider } from '../providers/AppSessionProvider';

type BootstrapProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function BootstrapProviders({ queryClient, children }: BootstrapProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppSessionProvider>{children}</AppSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
