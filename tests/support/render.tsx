import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BootstrapProviders } from '../../src/app/bootstrap/BootstrapProviders';
import { createBootstrapQueryClient } from '../../src/app/bootstrap/query-client';

export function renderBootstrap(ui: ReactElement, initialPath = '/') {
  const queryClient = createBootstrapQueryClient();
  const result = render(
    <BootstrapProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </BootstrapProviders>,
  );
  return { ...result, queryClient };
}
