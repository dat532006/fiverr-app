import { describe, expect, it } from 'vitest';
import { toHireId } from '../../src/shared/models/hire-id';
import { toUserId } from '../../src/shared/models/user-id';

describe('TASK-013 UserId / HireId factories', () => {
  it('mint a string carrier from a positive safe integer', () => {
    expect(toUserId(4242)).toBe('4242');
    expect(toHireId(29187)).toBe('29187');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    'reject %s instead of minting an unusable id',
    (raw) => {
      expect(() => toUserId(raw)).toThrow(RangeError);
      expect(() => toHireId(raw)).toThrow(RangeError);
    },
  );
});
