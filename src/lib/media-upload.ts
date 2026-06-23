export type MediaFileType = "image" | "audio";

export const MEDIA_LIMITS = {
  image: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/png"],
    extensions: [".png"],
    allowedFormats: "png",
    resourceType: "image" as const,
    folder: "shammah-admin/images",
  },
  audio: {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"],
    extensions: [".mp3", ".wav"],
    allowedFormats: "mp3,wav",
    resourceType: "video" as const,
    folder: "shammah-admin/audio",
  },
} as const;

export function formatMaxSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb}MB`;
}

export function parseCloudinaryUploadError(responseText: string): string {
  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string };
    };
    const message = parsed.error?.message?.trim();
    if (message) {
      return message;
    }
  } catch {
    // Fall through to generic message.
  }

  return "Upload was rejected by Cloudinary.";
}

export function validateMediaFile(
  file: File,
  fileType: MediaFileType
): string | null {
  const limits = MEDIA_LIMITS[fileType];
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  if (!(limits.extensions as readonly string[]).includes(extension)) {
    return `Invalid file type. Allowed: ${limits.extensions.join(", ")}`;
  }

  if (
    file.type &&
    !(limits.mimeTypes as readonly string[]).includes(file.type)
  ) {
    return `Invalid MIME type (${file.type || "unknown"}).`;
  }

  if (file.size > limits.maxBytes) {
    return `File is too large. Maximum size is ${formatMaxSize(limits.maxBytes)}.`;
  }

  if (file.size === 0) {
    return "File is empty.";
  }

  return null;
}

export function isValidCloudinaryMediaUrl(
  url: string,
  fileType: MediaFileType,
  cloudName?: string
): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return false;
    }

    if (
      parsed.hostname !== "res.cloudinary.com" &&
      !parsed.hostname.endsWith(".cloudinary.com")
    ) {
      return false;
    }

    if (cloudName && !parsed.pathname.includes(`/${cloudName}/`)) {
      return false;
    }

    const pathname = parsed.pathname.toLowerCase();
    const limits = MEDIA_LIMITS[fileType];

    return limits.extensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}
