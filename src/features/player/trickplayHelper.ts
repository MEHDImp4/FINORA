export function getTrickplayThumbnailUrl(
  serverUrl: string,
  itemId: string,
  targetSeconds: number,
  width: number = 320
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const ticks = Math.round(targetSeconds * 10000000);
  return `${cleanUrl}/Items/${itemId}/Images/Primary?maxWidth=${width}&tag=trickplay_${ticks}`;
}
