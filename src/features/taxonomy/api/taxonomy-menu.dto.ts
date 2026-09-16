export class TaxonomyDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu danh mục.');
    this.name = 'TaxonomyDecodeError';
  }
}

export interface DetailCategoryDto {
  readonly id: number;
  readonly tenChiTiet: string;
}

export interface GroupDto {
  readonly id: number;
  readonly tenNhom: string;
  readonly hinhAnh: string;
  readonly maLoaiCongviec: number;
  readonly dsChiTietLoai: readonly DetailCategoryDto[];
}

export interface TopCategoryDto {
  readonly id: number;
  readonly tenLoaiCongViec: string;
  readonly dsNhomChiTietLoai: readonly GroupDto[];
}

function decodeDetail(input: unknown): DetailCategoryDto {
  if (typeof input !== 'object' || input === null || !('id' in input) || !('tenChiTiet' in input)) {
    throw new TaxonomyDecodeError();
  }
  const { id, tenChiTiet } = input;
  if (typeof id !== 'number' || !Number.isFinite(id) || typeof tenChiTiet !== 'string') {
    throw new TaxonomyDecodeError();
  }
  return { id, tenChiTiet };
}

function decodeGroup(input: unknown): GroupDto {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('id' in input) ||
    !('tenNhom' in input) ||
    !('hinhAnh' in input) ||
    !('maLoaiCongviec' in input) ||
    !('dsChiTietLoai' in input)
  ) {
    throw new TaxonomyDecodeError();
  }
  const { id, tenNhom, hinhAnh, maLoaiCongviec, dsChiTietLoai } = input;
  if (
    typeof id !== 'number' ||
    !Number.isFinite(id) ||
    typeof tenNhom !== 'string' ||
    typeof hinhAnh !== 'string' ||
    typeof maLoaiCongviec !== 'number' ||
    !Number.isFinite(maLoaiCongviec) ||
    !Array.isArray(dsChiTietLoai)
  ) {
    throw new TaxonomyDecodeError();
  }
  return {
    id,
    tenNhom,
    hinhAnh,
    maLoaiCongviec,
    dsChiTietLoai: dsChiTietLoai.map(decodeDetail),
  };
}

function decodeTop(input: unknown): TopCategoryDto {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('id' in input) ||
    !('tenLoaiCongViec' in input) ||
    !('dsNhomChiTietLoai' in input)
  ) {
    throw new TaxonomyDecodeError();
  }
  const { id, tenLoaiCongViec, dsNhomChiTietLoai } = input;
  if (
    typeof id !== 'number' ||
    !Number.isFinite(id) ||
    typeof tenLoaiCongViec !== 'string' ||
    !Array.isArray(dsNhomChiTietLoai)
  ) {
    throw new TaxonomyDecodeError();
  }
  return {
    id,
    tenLoaiCongViec,
    dsNhomChiTietLoai: dsNhomChiTietLoai.map(decodeGroup),
  };
}

// A missing/null/non-array `content` is a decode failure. It must never be
// silently coerced to `[]`, because a genuinely empty menu ([] top categories)
// is a distinct, legitimate state that downstream UI must not treat as an error.
export function decodeTaxonomyMenuResponse(input: unknown): readonly TopCategoryDto[] {
  if (typeof input !== 'object' || input === null || !('content' in input)) {
    throw new TaxonomyDecodeError();
  }
  const { content } = input;
  if (!Array.isArray(content)) {
    throw new TaxonomyDecodeError();
  }
  return content.map(decodeTop);
}
