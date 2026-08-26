import { createClient } from "@/lib/supabase";

const BUCKET_NAME = "package-images";

export async function uploadPackageImage(
  file: File,
  packageName: string
): Promise<string> {
  const supabase = createClient();

  // Create a unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${packageName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${fileExt}`;
  const filePath = `packages/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function deletePackageImage(filePath: string): Promise<void> {
  const supabase = createClient();

  // Extract the path from the full URL if needed
  const path = filePath.includes(BUCKET_NAME)
    ? filePath.split(`${BUCKET_NAME}/`)[1]
    : filePath;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }
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
