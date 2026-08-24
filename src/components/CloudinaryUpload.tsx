"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Music,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  MEDIA_LIMITS,
  formatMaxSize,
  isValidCloudinaryMediaUrl,
  parseCloudinaryUploadError,
  validateMediaFile,
  type MediaFileType,
} from "@/lib/media-upload";

interface CloudinaryUploadProps {
  onUploadSuccess: (url: string) => void;
  fileType: MediaFileType;
  initialUrl?: string;
  label?: string;
}

interface UploadStatusResponse {
  configured: boolean;
  cloudName: string | null;
}

interface SignedUploadResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
  resourceType: "image" | "video";
  error?: string;
}

export default function CloudinaryUpload({
  onUploadSuccess,
  fileType,
  initialUrl = "",
  label = "Upload Media",
}: CloudinaryUploadProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [cloudName, setCloudName] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limits = MEDIA_LIMITS[fileType];

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch("/api/cloudinary/sign");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as UploadStatusResponse;
        if (!cancelled) {
          setIsConfigured(data.configured);
          setCloudName(data.cloudName);
        }
      } catch {
        if (!cancelled) {
          setIsConfigured(false);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestSignedUpload = useCallback(async (): Promise<SignedUploadResponse> => {
    if (!user) {
      throw new Error("You must be signed in to upload media.");
    }

    const idToken = await user.getIdToken();
    const response = await fetch("/api/cloudinary/sign", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileType }),
    });

    const data = (await response.json()) as SignedUploadResponse;

    if (!response.ok) {
      throw new Error(data.error || "Failed to authorize upload.");
    }

    return data;
  }, [fileType, user]);

  const handleUpload = async (file: File) => {
    if (!isConfigured) {
      setError(
        "Secure upload is not configured. Paste a Cloudinary HTTPS URL instead."
      );
      return;
    }

    const validationError = validateMediaFile(file, fileType);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const signed = await requestSignedUpload();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append("file", file);
        formData.append("api_key", signed.apiKey);
        formData.append("timestamp", String(signed.timestamp));
        formData.append("signature", signed.signature);
        formData.append("folder", signed.folder);
        formData.append("allowed_formats", signed.allowedFormats);

        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
          true
        );

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100
            );
            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText) as {
              secure_url?: string;
            };
            const secureUrl = response.secure_url;

            if (!secureUrl) {
              reject(new Error("Upload succeeded but no URL was returned."));
              return;
            }

            setUrl(secureUrl);
            onUploadSuccess(secureUrl);
            resolve();
            return;
          }

          console.error("Cloudinary upload failed:", xhr.responseText);
          reject(new Error(parseCloudinaryUploadError(xhr.responseText)));
        };

        xhr.onerror = () => {
          reject(new Error("A network error occurred during the upload."));
        };

        xhr.send(formData);
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload media.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void handleUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      void handleUpload(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setUrl("");
    setUrlError(null);
    onUploadSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);

    if (!value) {
      setUrlError(null);
      onUploadSuccess("");
      return;
    }

    if (!isValidCloudinaryMediaUrl(value, fileType, cloudName ?? undefined)) {
      setUrlError(
        cloudName
          ? `Enter a valid HTTPS Cloudinary URL for this account (${limits.extensions.join(", ")}).`
          : `Enter a valid HTTPS Cloudinary URL (${limits.extensions.join(", ")}).`
      );
      onUploadSuccess("");
      return;
    }

    setUrlError(null);
    onUploadSuccess(value);
  };

  const accept =
    fileType === "image"
      ? "image/png,image/x-png,image/apng,image/jpeg,image/jpg,image/pjpeg,.png,.jpg,.jpeg"
      : "audio/mpeg,audio/wav,audio/mp3,audio/x-wav";

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
        {url && !urlError && (
          <button
            type="button"
            onClick={clearSelection}
            className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="h-3 w-3" /> Clear Media
          </button>
        )}
      </div>

      {!statusLoading && !isConfigured && (
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Secure Upload Unavailable:</span>{" "}
            Configure server-side Cloudinary and Firebase Admin credentials, or
            paste a direct Cloudinary HTTPS URL below.
          </div>
        </div>
      )}

      {!url && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            isConfigured && !uploading && fileInputRef.current?.click()
          }
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${
            isConfigured && !uploading
              ? "cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5"
              : "border-slate-800 bg-slate-900/10 cursor-not-allowed"
          } ${
            isDragActive
              ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
              : "border-slate-800 bg-slate-900/40"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            className="hidden"
            disabled={uploading || !isConfigured || statusLoading}
          />

          {uploading ? (
            <div className="w-full max-w-[240px] space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-indigo-400 transition-colors">
                {fileType === "image" ? (
                  <ImageIcon className="h-5.5 w-5.5 text-indigo-400" />
                ) : (
                  <Music className="h-5.5 w-5.5 text-pink-400" />
                )}
              </div>
              <div className="text-xs text-slate-300">
                {isConfigured ? (
                  <p>
                    <span className="font-semibold text-indigo-400">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                ) : (
                  <p className="text-slate-500">
                    {statusLoading
                      ? "Checking upload configuration..."
                      : "Signed uploads not configured"}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                {fileType === "image"
                  ? `PNG up to ${formatMaxSize(limits.maxBytes)}`
                  : `MP3, WAV up to ${formatMaxSize(limits.maxBytes)}`}
              </p>
            </div>
          )}
        </div>
      )}

      {url && !urlError && (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Media Configured
            </span>
            <p
              className="text-xs font-medium text-slate-300 truncate"
              title={url}
            >
              {url}
            </p>
          </div>
          {fileType === "image" && (
            <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={url}
                alt="Upload preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-slate-500">
          OR ENTER DIRECT CLOUDINARY URL
        </span>
        <input
          type="url"
          placeholder={
            fileType === "image"
              ? "https://res.cloudinary.com/.../image.png"
              : "https://res.cloudinary.com/.../audio.mp3"
          }
          value={url}
          onChange={handleUrlPaste}
          className={`w-full rounded-xl border bg-slate-900/50 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:ring-1 outline-none transition-all ${
            urlError
              ? "border-red-500/80 focus:border-red-500/80 focus:ring-red-500/80"
              : "border-slate-800 focus:border-indigo-500/80 focus:ring-indigo-500/80"
          }`}
        />
      </div>

      {urlError && (
        <p className="text-xs font-medium text-red-400 flex items-center gap-1.5 mt-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {urlError}
        </p>
      )}

      {error && (
        <p className="text-xs font-medium text-red-400 flex items-center gap-1.5 mt-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
