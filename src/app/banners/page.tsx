"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  Image as ImageIcon,
  Check,
  X,
  AlertTriangle,
  ArrowUpDown
} from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner>>({});
  
  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    const q = collection(db, "banners");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Banner[];
      
      // Client-side sort by order (handles missing fields gracefully)
      list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      
      setBanners(list);
      setSyncError(null);
      setLoading(false);
    }, (err) => {
      console.error("Firestore sync error:", err);
      setSyncError("Connection failed: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setModalType("add");
    setCurrentBanner({});
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLinkUrl("");
    setIsActive(true);
    setOrder(banners.length + 1);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setModalType("edit");
    setCurrentBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || "");
    setImageUrl(banner.imageUrl);
    setLinkUrl(banner.linkUrl || "");
    setIsActive(banner.isActive);
    setOrder(banner.order);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      setError("Banner Title and Image URL are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const bannerData = {
      title,
      subtitle: subtitle || null,
      imageUrl,
      linkUrl: linkUrl || null,
      isActive,
      order: Number(order) || 0,
      updatedAt: serverTimestamp(),
    };

    try {
      if (modalType === "add") {
        await addDoc(collection(db, "banners"), {
          ...bannerData,
          createdAt: serverTimestamp(),
        });
      } else {
        if (currentBanner.id) {
          await updateDoc(doc(db, "banners", currentBanner.id), bannerData);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error saving banner:", err);
      setError("Failed to save banner. Please check database permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner permanently?")) return;
    try {
      await deleteDoc(doc(db, "banners", id));
    } catch (err) {
      console.error("Error deleting banner:", err);
      alert("Failed to delete banner. Check permissions.");
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateDoc(doc(db, "banners", banner.id), {
        isActive: !banner.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-sm font-medium tracking-wide">Syncing banners collection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Sync Error Alert */}
      {syncError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Firestore Sync Failed:</span> {syncError}
          </div>
        </div>
      )}

      {/* Upper Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-text">Overview & Controls</p>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Promo Banners ({banners.length})
          </h1>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-slate-100 transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" /> Add Banner
        </button>
      </div>

      {/* Main Grid display */}
      {banners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">No Banners Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Create your very first banner slide to display on your application homepage.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-800 transition-all"
          >
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="rounded-3xl border border-slate-900 bg-slate-950/40 overflow-hidden flex flex-col justify-between hover:border-slate-800/80 transition-all group"
            >
              {/* Banner Image Preview Container */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden border-b border-slate-900">
                {banner.imageUrl ? (
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title} 
                    className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-655">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                {/* Active Indicator Floating Badge */}
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`absolute top-4 right-4 rounded-xl px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 ${
                    banner.isActive 
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                      : "text-slate-400 bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${banner.isActive ? "bg-emerald-400" : "bg-slate-400"}`}></span>
                  {banner.isActive ? "Active" : "Draft"}
                </button>

                {/* Display Sequence Order Badge */}
                <div className="absolute bottom-4 left-4 rounded-lg bg-slate-950/70 border border-slate-900/60 px-2 py-0.5 text-[9px] font-bold text-slate-300 tracking-wider">
                  SEQ: {banner.order}
                </div>
              </div>

              {/* Title & Details Panel */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-200 tracking-tight truncate" title={banner.title}>
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-[11px] text-slate-500 line-clamp-2" title={banner.subtitle}>
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                {/* Bottom Details Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-900/60 text-[10px]">
                  {banner.linkUrl ? (
                    <a 
                      href={banner.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold truncate max-w-[150px]"
                    >
                      Redirection URL <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-slate-600 font-medium italic">No Redirect Target</span>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 rounded-xl text-slate-450 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100 transition-colors"
                      title="Edit Banner"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-2 rounded-xl text-slate-450 border border-slate-900 hover:border-red-950 hover:bg-red-500/5 hover:text-red-400 transition-colors"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD MODAL FOR ADDING/EDITING BANNERS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {modalType === "add" ? "Create New Banner" : "Edit Banner Settings"}
                </h3>
                <p className="text-[10px] text-slate-500">Provide details for home sliding card</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error:</span> {error}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4.5">
              {/* Title Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                  Banner Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Annual Youth Conference"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              {/* Subtitle Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                  Subtitle / Description
                </label>
                <textarea
                  placeholder="Short caption text describing this banner..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[70px]"
                />
              </div>

              {/* Dynamic Cloudinary Uploader */}
              <CloudinaryUpload 
                fileType="image"
                onUploadSuccess={(url) => setImageUrl(url)}
                initialUrl={imageUrl}
                label="Banner Image (.png only) *"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Sequence Order */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                    Order Sequence
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Active Toggle Switch */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                    Visibility Status
                  </span>
                  <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-200 font-medium select-none">
                      Publish active on homepage
                    </span>
                  </label>
                </div>
              </div>

              {/* Redirection Link URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                  Redirection Link URL (Redirection target onClick)
                </label>
                <input
                  type="url"
                  placeholder="https://shammah.org/youth-registration"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-800 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-100 px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Banner"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
