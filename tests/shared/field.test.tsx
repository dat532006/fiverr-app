import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from '../../src/shared/ui/Field';

function renderField(props: { error?: string; help?: string } = {}) {
  return render(
    <Field label="Tên hiển thị" {...props}>
      {(control) => <input {...control} type="text" />}
    </Field>,
  );
}

describe('TASK-013 (CP-02) shared Field primitive', () => {
  it('associates the visible label with the control', () => {
    renderField();
    const input = screen.getByLabelText('Tên hiển thị');
    expect(input.tagName).toBe('INPUT');
    expect(screen.getByText('Tên hiển thị').tagName).toBe('LABEL');
  });

  it('has no aria-invalid and no aria-describedby without a message', () => {
    renderField();
    const input = screen.getByLabelText('Tên hiển thị');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('marks the control invalid and describes it by the error text', () => {
    renderField({ error: 'Vui lòng nhập tên.' });
    const input = screen.getByLabelText('Tên hiển thị');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(message?.textContent).toContain('Vui lòng nhập tên.');
  });

  it('describes the control by help text without marking it invalid', () => {
    renderField({ help: 'Tối đa 40 ký tự.' });
    const input = screen.getByLabelText('Tên hiển thị');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(message?.textContent).toBe('Tối đa 40 ký tự.');
  });

  it('shows the error in place of help text', () => {
    renderField({ error: 'Lỗi.', help: 'Gợi ý.' });
    expect(screen.getByText('Lỗi.')).toBeTruthy();
    expect(screen.queryByText('Gợi ý.')).toBeNull();
  });

  it('reserves the message line whether or not there is a message, so layout does not jump', () => {
    const { container, rerender } = renderField();
    const reserved = () => container.querySelector('[id$="-message"]');
    expect(reserved()?.className).toContain('min-h-5');
    rerender(
      <Field label="Tên hiển thị" error="Vui lòng nhập tên.">
        {(control) => <input {...control} type="text" />}
      </Field>,
    );
    expect(reserved()?.className).toContain('min-h-5');
    // The same element persists: only its content changes.
    expect(container.querySelectorAll('[id$="-message"]')).toHaveLength(1);
  });

  it('gives the control a themed focus-visible ring, a 44px target and a danger border when invalid', () => {
    renderField({ error: 'Lỗi.' });
    const input = screen.getByLabelText('Tên hiển thị');
    expect(input.className).toContain('focus-visible:ring-2');
    expect(input.className).toContain('focus-visible:ring-[color:var(--accent)]');
    expect(input.className).toContain('min-h-11');
    expect(input.className).toContain('border-[color:var(--danger)]');
    // Tokens only: no raw colour value in the class list.
    expect(input.className).not.toMatch(/#[0-9a-f]{3,8}|rgb\(|oklch\(/i);
  });

  it('keeps ids unique across fields', () => {
    render(
      <>
        <Field label="Một">{(control) => <input {...control} />}</Field>
        <Field label="Hai">{(control) => <input {...control} />}</Field>
      </>,
    );
    expect(screen.getByLabelText('Một').id).not.toBe(screen.getByLabelText('Hai').id);
  });

  it('wraps any control, not only inputs', () => {
    render(
      <Field label="Ghi chú" error="Lỗi.">
        {(control) => <textarea {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText('Ghi chú').tagName).toBe('TEXTAREA');
  });
});
