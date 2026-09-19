import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MyHiresAdmissionDecodeError,
  decodeMyHiresAdmission,
} from '../../src/features/hires/api/my-hires-admission.dto';

// Session admission must mint no HireId and no JobId. The factories are replaced with spies
// so any call from the admission projection is observable.
const mintCalls = vi.hoisted(() => ({ hire: vi.fn(), job: vi.fn() }));
vi.mock('../../src/shared/models/hire-id', () => ({ toHireId: mintCalls.hire }));
vi.mock('../../src/features/jobs/model/job-id', () => ({ toJobId: mintCalls.job }));

// The verified E50 wire item (family C): outer id = HireId, nested congViec.id = JobId.
const nestedItem = {
  id: 29187,
  ngayThue: '',
  hoanThanh: false,
  congViec: { id: 1, tenCongViec: 'Job', nguoiTao: 1 },
};

beforeEach(() => {
  mintCalls.hire.mockClear();
  mintCalls.job.mockClear();
});

describe('TASK-013 T01 E50 session-admission projection', () => {
  it('admits the verified empty envelope: an account with no hires is valid', () => {
    expect(decodeMyHiresAdmission({ statusCode: 200, content: [] })).toEqual({
      admitted: true,
      itemCount: 0,
    });
  });

  it('admits a non-empty envelope without decoding any item', () => {
    expect(decodeMyHiresAdmission({ statusCode: 200, content: [nestedItem] })).toEqual({
      admitted: true,
      itemCount: 1,
    });
  });

  it('does not require nested job prevalence: a null or missing congViec still admits', () => {
    expect(
      decodeMyHiresAdmission({
        content: [{ id: 1, congViec: null }, { id: 2 }, 'not-even-an-object'],
      }).itemCount,
    ).toBe(3);
  });

  it('creates no HireId and no JobId, for empty and non-empty envelopes alike', () => {
    decodeMyHiresAdmission({ content: [] });
    decodeMyHiresAdmission({ content: [nestedItem, nestedItem] });
    expect(mintCalls.hire).toHaveBeenCalledTimes(0);
    expect(mintCalls.job).toHaveBeenCalledTimes(0);
  });

  it('returns nothing about a hire: no id, no job, no item', () => {
    const result = decodeMyHiresAdmission({ content: [nestedItem] });
    expect(Object.keys(result).sort()).toEqual(['admitted', 'itemCount']);
    expect(JSON.stringify(result)).not.toContain('29187');
  });

  it('rejects the flat E46 paging response: its content is an object, not an array', () => {
    const e46 = {
      statusCode: 200,
      content: { pageIndex: 1, pageSize: 10, totalRow: 1642, keywords: null, data: [] },
    };
    expect(() => decodeMyHiresAdmission(e46)).toThrow(MyHiresAdmissionDecodeError);
    // ...and the paging object without its envelope is not an admission envelope either.
    expect(() => decodeMyHiresAdmission(e46.content)).toThrow(MyHiresAdmissionDecodeError);
  });

  it.each([
    ['a string content (the verified 403 body shape)', { content: 'forbidden' }],
    ['a missing content', { statusCode: 200 }],
    ['a null content', { content: null }],
    ['a numeric content', { content: 0 }],
    ['an object content', { content: {} }],
    ['a non-object body', 'text'],
    ['a null body', null],
    ['a top-level array', []],
  ])('rejects %s', (_label, body) => {
    expect(() => decodeMyHiresAdmission(body)).toThrow(MyHiresAdmissionDecodeError);
  });

  // An E46-style flat Hire item inside an array is a negative case for TASK-018's full
  // display decoder, not for session admission, which never inspects array items.
  it('leaves item-shape rejection to the later display decoder', () => {
    const flat = { id: 5, maCongViec: 3, maNguoiThue: 9, ngayThue: '', hoanThanh: false };
    expect(decodeMyHiresAdmission({ content: [flat] }).itemCount).toBe(1);
  });
});
