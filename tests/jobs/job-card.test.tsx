import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { JobCard } from '../../src/features/jobs/components/JobCard';
import { toJobId } from '../../src/features/jobs/model/job-id';
import type { Job } from '../../src/features/jobs/model/job.model';

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: toJobId(900123),
    title: 'Thiết kế logo',
    shortDescription: 'Mô tả ngắn',
    description: 'Mô tả đầy đủ',
    imageUrl: null,
    price: 100000,
    starRating: 4,
    reviewCount: 12,
    ...overrides,
  };
}

describe('JobCard navigation (T02)', () => {
  it('links to the job route using the job DTO id, not an unrelated numeric field', () => {
    render(
      <MemoryRouter>
        <JobCard job={job({ id: toJobId(900123) })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/job/900123');
  });

  it('never substitutes a category/creator id for the job id in the route', () => {
    // A job whose id happens to look like a plausible category id must still
    // route by its own JobId, not by any other numeric field it carries.
    render(
      <MemoryRouter>
        <JobCard job={job({ id: toJobId(555) })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/job/555');
    expect(screen.getByRole('link').getAttribute('href')).not.toBe('/job/999');
  });
});
