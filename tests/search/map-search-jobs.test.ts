import { describe, expect, it } from 'vitest';
import { mapSearchJobs } from '../../src/features/search/model/map-search-jobs';
import type { CongViecDto } from '../../src/features/search/api/search-jobs.dto';

function dto(overrides: Partial<CongViecDto> = {}): CongViecDto {
  return {
    id: 1,
    tenCongViec: 'Job A',
    danhGia: 5,
    giaTien: 100,
    nguoiTao: 42,
    hinhAnh: 'https://fiverrnew.cybersoft.edu.vn/images/a.jpg',
    moTa: 'Full description',
    maChiTietLoaiCongViec: 900003,
    moTaNgan: 'Short',
    saoCongViec: 4,
    ...overrides,
  };
}

describe('mapSearchJobs', () => {
  it('preserves source order (no client-side sort/rank)', () => {
    const dtos = [
      dto({ id: 3, tenCongViec: 'C' }),
      dto({ id: 1, tenCongViec: 'A' }),
      dto({ id: 2, tenCongViec: 'B' }),
    ];
    const jobs = mapSearchJobs(dtos);
    expect(jobs.map((job) => job.title)).toEqual(['C', 'A', 'B']);
  });

  it('preserves zero price and zero rating as zero, not falsy/missing', () => {
    const [job] = mapSearchJobs([dto({ giaTien: 0, saoCongViec: 0 })]);
    expect(job?.price).toBe(0);
    expect(job?.starRating).toBe(0);
  });

  it('brands the job id from the job DTO id field, not an unrelated field (T02)', () => {
    const [job] = mapSearchJobs([dto({ id: 900123, maChiTietLoaiCongViec: 555, nguoiTao: 777 })]);
    expect(job?.id).toBe('900123');
  });

  it('rejects a non-http(s) image URL as null instead of rendering it raw', () => {
    const [job] = mapSearchJobs([dto({ hinhAnh: 'javascript:alert(1)' })]);
    expect(job?.imageUrl).toBeNull();
  });

  it('keeps a valid http(s) image URL as-is', () => {
    const [job] = mapSearchJobs([
      dto({ hinhAnh: 'https://fiverrnew.cybersoft.edu.vn/images/a.jpg' }),
    ]);
    expect(job?.imageUrl).toBe('https://fiverrnew.cybersoft.edu.vn/images/a.jpg');
  });

  it('maps an empty image string to null rather than an empty src', () => {
    const [job] = mapSearchJobs([dto({ hinhAnh: '' })]);
    expect(job?.imageUrl).toBeNull();
  });
});
