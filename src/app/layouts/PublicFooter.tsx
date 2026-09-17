const FOOTER_COLUMNS = [
  { title: 'Danh mục', links: ['Graphics & Design', 'Digital Marketing', 'Writing & Translation'] },
  { title: 'Tài khoản', links: ['Đăng nhập', 'Đăng ký', 'Lượt thuê của tôi'] },
  { title: 'Về Servio', links: ['Giới thiệu', 'Liên hệ'] },
  { title: 'Dự án', links: ['Nguồn dữ liệu CyberSoft', 'Ghi chú kỹ thuật'] },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--line)] bg-[color:var(--panel)] py-10">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 sm:grid-cols-2 md:grid-cols-4 md:px-6">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mb-3 text-sm font-semibold text-[color:var(--ink)]">{column.title}</p>
            <ul className="space-y-2 text-sm text-[color:var(--muted)]">
              {column.links.map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-[1200px] px-4 text-xs text-[color:var(--muted)] md:px-6">
        Dự án cuối khóa BCFE — CyberSoft. Giao diện demo, không phải sàn thương mại thật.
      </p>
    </footer>
  );
}
