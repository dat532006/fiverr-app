export class MyHiresAdmissionDecodeError extends Error {
  constructor() {
    super('Không đọc được dữ liệu xác nhận phiên.');
    this.name = 'MyHiresAdmissionDecodeError';
  }
}

// The session-admission result: nothing about any hire. Item fields, nested jobs and every
// identifier inside `content[]` are deliberately not decoded here; the later display read
// owns the full E50 projection (and mints HireId / JobId there, not here).
export interface MineAdmission {
  readonly admitted: true;
  readonly itemCount: number;
}

// E50 admission projection. Admits only an envelope object whose `content` is an array:
// `[]` (an account with no hires) and non-empty arrays both admit. A string `content`, a
// missing `content`, or a paging object such as E46's `{ pageIndex, ..., data }` do not.
export function decodeMyHiresAdmission(input: unknown): MineAdmission {
  if (typeof input !== 'object' || input === null || !('content' in input)) {
    throw new MyHiresAdmissionDecodeError();
  }
  const { content } = input;
  if (!Array.isArray(content)) {
    throw new MyHiresAdmissionDecodeError();
  }
  return { admitted: true, itemCount: content.length };
}
