import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { BootstrapApp } from '../src/app/bootstrap/BootstrapApp';
import { TAXONOMY_MENU_QUERY_KEY } from '../src/features/taxonomy/queries/taxonomy-menu.query-options';
import { renderBootstrap } from './support/render';

describe('TASK-005/007 bootstrap composition', () => {
  it('mounts the real app at a nested/unknown path without starting network requests', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'send');
    const { queryClient } = renderBootstrap(<BootstrapApp />, '/bootstrap/probe');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' }).textContent).toBe(
      'Không tìm thấy trang',
    );
    // The header's taxonomy menu widget mounts on every page but defers its
    // fetch until opened, so only an idle (non-fetching) cache entry exists.
    const cachedQueries = queryClient.getQueryCache().getAll();
    expect(cachedQueries.map((query) => query.queryKey)).toEqual([TAXONOMY_MENU_QUERY_KEY]);
    expect(cachedQueries[0]?.state.fetchStatus).toBe('idle');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('provides a fresh QueryClient for each isolated render', () => {
    const first = renderBootstrap(<BootstrapApp />);
    first.queryClient.setQueryData(['synthetic-bootstrap'], 'first-render');
    first.unmount();
    const second = renderBootstrap(<BootstrapApp />);
    expect(second.queryClient).not.toBe(first.queryClient);
    expect(second.queryClient.getQueryData(['synthetic-bootstrap'])).toBeUndefined();
    expect(second.queryClient.getDefaultOptions().mutations).toMatchObject({
      retry: 0,
      networkMode: 'always',
    });
    first.queryClient.clear();
    second.queryClient.clear();
  });

  it('supports Router navigation and Query context in the test harness', async () => {
    function HarnessProbe() {
      const location = useLocation();
      const queryClient = useQueryClient();
      return (
        <>
          <Link to="/probe">Đi tiếp</Link>
          <output>{location.pathname}</output>
          <span>{queryClient.getQueryCache().getAll().length}</span>
        </>
      );
    }
    renderBootstrap(<HarnessProbe />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Đi tiếp' }));
    expect(screen.getByRole('status').textContent).toBe('/probe');
  });
});
