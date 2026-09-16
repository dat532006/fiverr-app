import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicHeader } from '../../src/app/layouts/PublicHeader';
import { renderBootstrap } from '../support/render';

describe('theme toggle', () => {
  it('flips the document theme attribute and persists the choice', async () => {
    renderBootstrap(<PublicHeader />);
    const user = userEvent.setup();
    const initial = document.documentElement.dataset.theme;
    const toggle = screen.getByRole('button', { name: /Chuyển sang giao diện/ });
    await user.click(toggle);
    const next = document.documentElement.dataset.theme;
    expect(next).not.toBe(initial);
    expect(localStorage.getItem('servio-theme')).toBe(next);
  });
});
