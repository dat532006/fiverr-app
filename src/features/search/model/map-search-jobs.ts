import { toJobId, type Job } from '../../jobs/public';
import type { CongViecDto } from '../api/search-jobs.dto';

function parseImageUrl(hinhAnh: string): string | null {
  if (!hinhAnh) return null;
  try {
    const url = new URL(hinhAnh);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return hinhAnh;
  } catch {
    return null;
  }
}

function mapJob(dto: CongViecDto): Job {
  return {
    id: toJobId(dto.id),
    title: dto.tenCongViec,
    shortDescription: dto.moTaNgan,
    description: dto.moTa,
    imageUrl: parseImageUrl(dto.hinhAnh),
    price: dto.giaTien,
    starRating: dto.saoCongViec,
    reviewCount: dto.danhGia,
  };
}

// Preserves E28's source order — no client-side sort/combine/ranking.
export function mapSearchJobs(dtos: readonly CongViecDto[]): readonly Job[] {
  return dtos.map(mapJob);
}
