export class SearchJobsDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu tìm kiếm.');
    this.name = 'SearchJobsDecodeError';
  }
}

// Mirrors the `congViec` object nested inside each E28 (GET
// /api/cong-viec/lay-danh-sach-cong-viec-theo-ten/{TenCongViec}) result item —
// confirmed by live runtime evidence to be a joined ViewModel wrapper, not a
// flat CongViec (see SearchJobItemDto below). Every field documented on this
// model is decoded so a malformed/missing field fails decoding rather than
// becoming a silently incomplete success.
export interface CongViecDto {
  readonly id: number;
  readonly tenCongViec: string;
  readonly danhGia: number;
  readonly giaTien: number;
  readonly nguoiTao: number;
  readonly hinhAnh: string;
  readonly moTa: string;
  readonly maChiTietLoaiCongViec: number;
  readonly moTaNgan: string;
  readonly saoCongViec: number;
}

// Each E28 `content[]` entry is a search-result ViewModel wrapping the job
// under `congViec`, alongside seller/category display metadata (`avatar`,
// `tenNguoiTao`, `tenChiTietLoai`, ...) that the current Job model/UI does not
// use. Only `congViec` — the field this application actually needs — is
// decoded strictly; the rest is left undecoded rather than made mandatory.
export interface SearchJobItemDto {
  readonly congViec: CongViecDto;
}

function decodeCongViec(input: unknown): CongViecDto {
  if (typeof input !== 'object' || input === null) {
    throw new SearchJobsDecodeError();
  }
  if (
    !('id' in input) ||
    !('tenCongViec' in input) ||
    !('danhGia' in input) ||
    !('giaTien' in input) ||
    !('nguoiTao' in input) ||
    !('hinhAnh' in input) ||
    !('moTa' in input) ||
    !('maChiTietLoaiCongViec' in input) ||
    !('moTaNgan' in input) ||
    !('saoCongViec' in input)
  ) {
    throw new SearchJobsDecodeError();
  }
  const {
    id,
    tenCongViec,
    danhGia,
    giaTien,
    nguoiTao,
    hinhAnh,
    moTa,
    maChiTietLoaiCongViec,
    moTaNgan,
    saoCongViec,
  } = input;
  if (
    typeof id !== 'number' ||
    !Number.isFinite(id) ||
    typeof tenCongViec !== 'string' ||
    typeof danhGia !== 'number' ||
    !Number.isFinite(danhGia) ||
    typeof giaTien !== 'number' ||
    !Number.isFinite(giaTien) ||
    typeof nguoiTao !== 'number' ||
    !Number.isFinite(nguoiTao) ||
    typeof hinhAnh !== 'string' ||
    typeof moTa !== 'string' ||
    typeof maChiTietLoaiCongViec !== 'number' ||
    !Number.isFinite(maChiTietLoaiCongViec) ||
    typeof moTaNgan !== 'string' ||
    typeof saoCongViec !== 'number' ||
    !Number.isFinite(saoCongViec)
  ) {
    throw new SearchJobsDecodeError();
  }
  return {
    id,
    tenCongViec,
    danhGia,
    giaTien,
    nguoiTao,
    hinhAnh,
    moTa,
    maChiTietLoaiCongViec,
    moTaNgan,
    saoCongViec,
  };
}

// The wrapper's nested `congViec` is required for a successful search item —
// a missing/null/non-object `congViec` is a decode failure, same as any other
// malformed required field.
function decodeSearchJobItem(input: unknown): SearchJobItemDto {
  if (typeof input !== 'object' || input === null || !('congViec' in input)) {
    throw new SearchJobsDecodeError();
  }
  return { congViec: decodeCongViec(input.congViec) };
}

// A missing/null/non-array `content` is a decode failure. It must never be
// silently coerced to `[]`, because a genuinely empty result set ([] jobs) is
// a distinct, legitimate state that downstream UI must not treat as an error.
export function decodeSearchJobsResponse(input: unknown): readonly SearchJobItemDto[] {
  if (typeof input !== 'object' || input === null || !('content' in input)) {
    throw new SearchJobsDecodeError();
  }
  const { content } = input;
  if (!Array.isArray(content)) {
    throw new SearchJobsDecodeError();
  }
  return content.map(decodeSearchJobItem);
}
