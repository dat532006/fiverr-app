import { useState } from 'react';
import { PlaceholderImage } from './PlaceholderImage';

type ImageWithFallbackProps = Readonly<{
  src: string | null;
  alt: string;
  placeholderCaption: string;
  aspectRatio?: string;
  className?: string;
}>;

export function ImageWithFallback({
  src,
  alt,
  placeholderCaption,
  aspectRatio = '4 / 3',
  className,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <PlaceholderImage
        caption={placeholderCaption}
        aspectRatio={aspectRatio}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ aspectRatio }}
      onError={() => setFailed(true)}
      className={`${className ?? ''} w-full object-cover`}
    />
  );
}
