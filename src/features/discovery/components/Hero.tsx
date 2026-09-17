import { Search } from 'lucide-react';
import { PlaceholderImage } from '../../../shared/ui/PlaceholderImage';

// Static content sanctioned by W01/W03. The search input is decorative for
// TASK-007 — no route/API wiring is required at this slice.
const QUICK_SEARCH_TAGS = ['logo', 'video', 'wordpress', 'viết nội dung'];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:px-6 md:py-16">
      <div className="order-2 md:order-1">
        <h1 className="text-[32px] leading-tight font-semibold text-[color:var(--ink)] md:text-[46px] md:leading-[1.08]">
          Thuê người làm được việc, cho đúng việc bạn cần
        </h1>
        <label className="mt-6 flex items-center gap-2 rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--panel)] px-4 py-3">
          <Search aria-hidden="true" className="h-5 w-5 text-[color:var(--muted)]" />
          <span className="sr-only">Tìm kiếm dịch vụ</span>
          <input
            type="search"
            disabled
            placeholder="Bạn đang tìm dịch vụ gì?"
            className="w-full bg-transparent text-sm text-[color:var(--ink)] placeholder:text-[color:var(--muted)] focus:outline-none"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
          <span>Tìm nhiều:</span>
          {QUICK_SEARCH_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[color:var(--ink-2)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="order-1 md:order-2">
        <PlaceholderImage
          caption="ảnh hero / tĩnh theo W01"
          aspectRatio="4 / 3"
          className="rounded-2xl"
        />
      </div>
    </section>
  );
}
