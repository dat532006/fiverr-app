import { describe, expect, it } from 'vitest';
import { toJobId } from '../../src/features/jobs/model/job-id';

describe('toJobId', () => {
  it('brands the job id from its own numeric source field', () => {
    expect(toJobId(900123)).toBe('900123');
  });
});
