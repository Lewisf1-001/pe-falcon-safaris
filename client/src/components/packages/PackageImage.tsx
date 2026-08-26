import Image from "next/image";

type PackageImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
};

export function resolvePackageImageSrc(url: string) {
  if (!(url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }

  return url;
}

export default function PackageImage({
  src,
  alt,
  fill = true,
  sizes,
  className,
  priority = false,
  quality = 75,
}: PackageImageProps) {
  const imageSrc = resolvePackageImageSrc(src);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      quality={quality}
      loading={priority ? undefined : "lazy"}
    />
  );
}
