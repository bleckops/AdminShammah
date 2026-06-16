"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, 
  Music, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  X
} from "lucide-react";

interface CloudinaryUploadProps {
  onUploadSuccess: (url: string) => void;
  fileType: "image" | "audio";
  initialUrl?: string;
  label?: string;
}

export default function CloudinaryUpload({ 
  onUploadSuccess, 
  fileType, 
  initialUrl = "", 
  label = "Upload Media" 
}: CloudinaryUploadProps) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const isCloudinaryConfigured = !!(cloudName && uploadPreset);

  const handleUpload = (file: File) => {
    if (!isCloudinaryConfigured) {
      setError("Cloudinary is not configured. Please paste a direct URL instead.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset!);

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const secureUrl = response.secure_url;
        setUrl(secureUrl);
        onUploadSuccess(secureUrl);
      } else {
        console.error("Cloudinary upload failed:", xhr.responseText);
        setError("Failed to upload. Verify Cloudinary Cloud Name and Preset.");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError("A network error occurred during the upload.");
    };

    xhr.send(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setUrl("");
    onUploadSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    onUploadSuccess(value);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
        {url && (
          <button
            type="button"
            onClick={clearSelection}
            className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="h-3 w-3" /> Clear Media
          </button>
        )}
      </div>

      {/* Cloudinary Missing Warning Alert */}
      {!isCloudinaryConfigured && (
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Cloudinary Credentials Pending:</span> Direct upload is disabled. Please configure your `.env.local` or paste a direct URL below.
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {!url && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => isCloudinaryConfigured && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${
            isCloudinaryConfigured 
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
            accept={fileType === "image" ? "image/png" : "audio/mpeg,audio/wav,audio/mp3"}
            className="hidden"
            disabled={uploading || !isCloudinaryConfigured}
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
                {isCloudinaryConfigured ? (
                  <p>
                    <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                  </p>
                ) : (
                  <p className="text-slate-500">Unsigned presets not configured</p>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                {fileType === "image" ? "PNG up to 10MB" : "MP3, WAV up to 50MB"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Media Active Review Card */}
      {url && (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Media Configured
            </span>
            <p className="text-xs font-medium text-slate-300 truncate" title={url}>
              {url}
            </p>
          </div>
          {/* Quick Preview Thumbnail */}
          {fileType === "image" && (
            <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img 
                src={url} 
                alt="Upload preview" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Manual Input Fallback */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-slate-500">
          OR ENTER DIRECT URL MANUALLY
        </span>
        <input
          type="url"
          placeholder={fileType === "image" ? "https://res.cloudinary.com/.../image.png" : "https://res.cloudinary.com/.../audio.mp3"}
          value={url}
          onChange={handleUrlPaste}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 outline-none transition-all"
        />
      </div>

      {error && (
        <p className="text-xs font-medium text-red-400 flex items-center gap-1.5 mt-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
