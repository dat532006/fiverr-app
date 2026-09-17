import { toJobId, type Job } from '../../jobs/public';
import type { CongViecDto, SearchJobItemDto } from '../api/search-jobs.dto';

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

// Extracts each wrapper's nested `congViec` here in the mapper layer, rather
// than disguising the E28 wrapper as a flat CongViec at the decoder boundary.
// Preserves E28's source order — no client-side sort/combine/ranking.
export function mapSearchJobs(items: readonly SearchJobItemDto[]): readonly Job[] {
  return items.map((item) => mapJob(item.congViec));
}
