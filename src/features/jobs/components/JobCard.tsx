import { Link } from 'react-router';
import type { Job } from '../model/job.model';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { jobPath } from '../../../app/routes/paths';

type JobCardProps = Readonly<{ job: Job }>;

const PRICE_FORMATTER = new Intl.NumberFormat('vi-VN');

export function JobCard({ job }: JobCardProps) {
  return (
    <Link
      to={jobPath(job.id)}
      className="flex flex-col overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
    >
      <ImageWithFallback
        src={job.imageUrl}
        alt={job.title}
        placeholderCaption="ảnh dịch vụ"
        aspectRatio="4 / 3"
      />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-[color:var(--ink)]">{job.title}</h3>
        {job.shortDescription ? (
          <p className="line-clamp-2 text-xs text-[color:var(--muted)]">{job.shortDescription}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-[color:var(--ink-2)]">
            ★ {job.starRating}
            <span className="text-[color:var(--muted)]"> ({job.reviewCount})</span>
          </span>
          <span className="font-semibold text-[color:var(--ink)]">
            {PRICE_FORMATTER.format(job.price)} đ
          </span>
        </div>
      </div>
    </Link>
  );
}
