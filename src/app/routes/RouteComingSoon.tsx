import { useParams } from 'react-router';

// TASK-007 owns route shape/navigation for the taxonomy hierarchy only, not the
// destination pages themselves (later tasks own category/group/detail listings).
export function RouteComingSoon() {
  const params = useParams();
  const entries = Object.entries(params);

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 text-center md:px-6">
      <h1 className="text-[28px] font-semibold text-[color:var(--ink)]">
        Trang đang được xây dựng
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Mục tiêu đã chọn hợp lệ, nội dung chi tiết sẽ có ở giai đoạn sau.
      </p>
      {entries.length > 0 ? (
        <dl className="mx-auto mt-6 inline-grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-left text-xs text-[color:var(--muted)]">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono">{key}</dt>
              <dd className="font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
