import type { JobId } from './job-id';

export type Job = Readonly<{
  id: JobId;
  title: string;
  shortDescription: string;
  description: string;
  imageUrl: string | null;
  price: number;
  starRating: number;
  reviewCount: number;
}>;
