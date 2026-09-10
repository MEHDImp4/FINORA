export type ImageType = "Primary" | "Backdrop" | "Logo" | "Thumb";

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
  tag?: string;
}

export function buildImageUrl(
  baseUrl: string,
  itemId: string,
  type: ImageType = "Primary",
  options: ImageUrlOptions = {}
): string {
  if (!baseUrl || !itemId) {
    return "";
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanBase}/Items/${itemId}/Images/${type}`);

  if (options.width) {
    url.searchParams.append("fillWidth", String(options.width));
  }
  if (options.height) {
    url.searchParams.append("fillHeight", String(options.height));
  }
  if (options.quality) {
    url.searchParams.append("quality", String(options.quality));
  }
  if (options.tag) {
    url.searchParams.append("tag", options.tag);
  }

  return url.toString();
}

export function getPosterUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 340
): string {
  return buildImageUrl(baseUrl, itemId, "Primary", {
    width: targetWidth,
    quality: 85,
    tag
  });
}

export function getBackdropUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 1080
): string {
  return buildImageUrl(baseUrl, itemId, "Backdrop", {
    width: targetWidth,
    quality: 80,
    tag
  });
}

export function getLogoUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 400
): string {
  return buildImageUrl(baseUrl, itemId, "Logo", {
    width: targetWidth,
    quality: 85,
    tag
  });
}

export function getPersonImageUrl(
  baseUrl: string,
  personId: string,
  tag?: string,
  targetWidth: number = 200
): string {
  return buildImageUrl(baseUrl, personId, "Primary", {
    width: targetWidth,
    quality: 80,
    tag
  });
}

