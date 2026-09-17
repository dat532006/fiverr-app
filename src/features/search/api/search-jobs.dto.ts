export class SearchJobsDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu tìm kiếm.');
    this.name = 'SearchJobsDecodeError';
  }
}

// Mirrors CyberSoft's CongViecViewModel (E28: GET
// /api/cong-viec/lay-danh-sach-cong-viec-theo-ten/{TenCongViec}). Every field
// documented on that model is decoded so a malformed/missing field fails
// decoding rather than becoming a silently incomplete success.
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

// A missing/null/non-array `content` is a decode failure. It must never be
// silently coerced to `[]`, because a genuinely empty result set ([] jobs) is
// a distinct, legitimate state that downstream UI must not treat as an error.
export function decodeSearchJobsResponse(input: unknown): readonly CongViecDto[] {
  if (typeof input !== 'object' || input === null || !('content' in input)) {
    throw new SearchJobsDecodeError();
  }
  const { content } = input;
  if (!Array.isArray(content)) {
    throw new SearchJobsDecodeError();
  }
  return content.map(decodeCongViec);
}
