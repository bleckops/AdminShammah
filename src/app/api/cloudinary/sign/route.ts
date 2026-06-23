import { NextResponse } from "next/server";
import {
  createSignedUploadParams,
  getPublicCloudName,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-server";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { MEDIA_LIMITS, type MediaFileType } from "@/lib/media-upload";
import { verifyAdminRequest } from "@/lib/verify-admin";

function isMediaFileType(value: unknown): value is MediaFileType {
  return value === "image" || value === "audio";
}

export async function GET() {
  return NextResponse.json({
    configured: isCloudinaryConfigured() && isFirebaseAdminConfigured(),
    cloudName: getPublicCloudName() ?? null,
  });
}

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 503 }
    );
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured on the server." },
      { status: 503 }
    );
  }

  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fileType =
    typeof body === "object" && body !== null && "fileType" in body
      ? (body as { fileType: unknown }).fileType
      : undefined;

  if (!isMediaFileType(fileType)) {
    return NextResponse.json(
      { error: "fileType must be 'image' or 'audio'." },
      { status: 400 }
    );
  }

  try {
    const signed = createSignedUploadParams(fileType);

    return NextResponse.json({
      ...signed,
      limits: {
        maxBytes: MEDIA_LIMITS[fileType].maxBytes,
        extensions: MEDIA_LIMITS[fileType].extensions,
      },
    });
  } catch (error) {
    console.error("Cloudinary sign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload signature." },
      { status: 500 }
    );
  }
}
