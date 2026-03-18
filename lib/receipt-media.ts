export function isVercelBlobUrl(value?: string | null) {
  return /https?:\/\/[^/]+\.blob\.vercel-storage\.com\//i.test(value ?? "");
}

export function getReceiptMediaSrc(receiptId: number, mediaPath?: string | null) {
  if (!mediaPath) {
    return null;
  }

  if (isVercelBlobUrl(mediaPath)) {
    return `/api/receipt-media/${receiptId}`;
  }

  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
    return mediaPath;
  }

  if (mediaPath.startsWith("/Users/")) {
    return `/api/receipt-media/${receiptId}`;
  }

  if (mediaPath.startsWith("/")) {
    return mediaPath;
  }

  return null;
}
