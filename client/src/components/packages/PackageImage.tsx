import Image from "next/image";

type PackageImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

export function isUploadedPackageImage(url: string) {
  return url.includes("/api/uploads/package-images/");
}

export function resolvePackageImageSrc(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
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
      unoptimized
    />
  );
}
