import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCloudName,
  getCloudinaryConfig,
  isCloudinaryConfigured,
} from "@/lib/env";
import { MEDIA_LIMITS, type MediaFileType } from "@/lib/media-upload";

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
  resourceType: "image" | "video";
}


export { isCloudinaryConfigured };

export function getPublicCloudName(): string | undefined {
  return getCloudinaryCloudName();
}

export function createSignedUploadParams(
  fileType: MediaFileType
): SignedUploadParams {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const limits = MEDIA_LIMITS[fileType];
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder: limits.folder,
    allowed_formats: limits.allowedFormats,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: limits.folder,
    allowedFormats: limits.allowedFormats,
    maxFileSize: limits.maxBytes,
    resourceType: limits.resourceType,
  };
}
