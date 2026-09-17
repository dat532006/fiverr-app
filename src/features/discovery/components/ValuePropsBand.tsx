import { MessageSquareText, Search, Users } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: Search,
    title: 'Tìm kiếm theo tên dịch vụ',
    description: 'Gõ đúng từ khóa để tìm dịch vụ phù hợp trong danh mục.',
  },
  {
    icon: MessageSquareText,
    title: 'Đọc bình luận trước khi thuê',
    description: 'Xem đánh giá thực tế từ khách hàng trước đó.',
  },
  {
    icon: Users,
    title: 'Theo dõi các lượt thuê ở một nơi',
    description: 'Quản lý toàn bộ lượt thuê dịch vụ trong một trang duy nhất.',
  },
] as const;

export function ValuePropsBand() {
  return (
    <section className="bg-[color:var(--panel-2)] py-12">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 md:grid-cols-3 md:px-6">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col items-start gap-2">
            <Icon aria-hidden="true" className="h-6 w-6 text-[color:var(--accent)]" />
            <h3 className="text-[20px] font-semibold text-[color:var(--ink)]">{title}</h3>
            <p className="text-sm text-[color:var(--muted)]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
