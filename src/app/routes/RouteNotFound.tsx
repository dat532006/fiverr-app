export function RouteNotFound() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 text-center md:px-6">
      <h1 className="text-[28px] font-semibold text-[color:var(--ink)]">Không tìm thấy trang</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Đường dẫn bạn truy cập không tồn tại.
      </p>
    </section>
  );
}
