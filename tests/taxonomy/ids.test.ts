import { describe, expect, it } from 'vitest';
import {
  toDetailCategoryId,
  toGroupId,
  toTopCategoryId,
} from '../../src/features/taxonomy/model/ids';

describe('taxonomy branded id factories', () => {
  it('tags each tier at its own construction site', () => {
    expect(toTopCategoryId(900002)).toBe('900002');
    expect(toGroupId(900002)).toBe('900002');
    expect(toDetailCategoryId(900002)).toBe('900002');
  });
});
