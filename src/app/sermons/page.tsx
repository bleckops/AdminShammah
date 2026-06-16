"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  FileVideo,
  Play, 
  Pause,
  Search,
  Calendar as CalendarIcon,
  User as UserIcon,
  X,
  AlertTriangle,
  Music,
  ExternalLink
} from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";

interface Sermon {
  id: string;
  title: string;
  description: string;
  speaker: string;
  date: Timestamp;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  category?: string | null;
  isActive: boolean;
}

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [filteredSermons, setFilteredSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentSermon, setCurrentSermon] = useState<Partial<Sermon>>({});

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [dateStr, setDateStr] = useState(""); // YYYY-MM-DD format
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Audio Preview state
  const [playingSermonId, setPlayingSermonId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    const q = collection(db, "sermons");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as Sermon[];
      
      // Client-side sort by date descending (handles missing fields gracefully)
      list.sort((a, b) => {
        const secondsA = a.date?.seconds || 0;
        const secondsB = b.date?.seconds || 0;
        return secondsB - secondsA;
      });
      
      setSermons(list);
      setFilteredSermons(list);
      setSyncError(null);
      setLoading(false);
    }, (err) => {
      console.error("Firestore sync error:", err);
      setSyncError("Connection failed: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter logic
  useEffect(() => {
    const queryLower = searchQuery.toLowerCase();
    const result = sermons.filter(
      (s) =>
        s.title.toLowerCase().includes(queryLower) ||
        s.speaker.toLowerCase().includes(queryLower) ||
        (s.category && s.category.toLowerCase().includes(queryLower))
    );
    setFilteredSermons(result);
  }, [searchQuery, sermons]);

  const openAddModal = () => {
    setModalType("add");
    setCurrentSermon({});
    setTitle("");
    setDescription("");
    setSpeaker("");
    
    // Default today date format YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    setDateStr(today);

    setImageUrl("");
    setAudioUrl("");
    setVideoUrl("");
    setCategory("");
    setIsActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (sermon: Sermon) => {
    setModalType("edit");
    setCurrentSermon(sermon);
    setTitle(sermon.title);
    setDescription(sermon.description || "");
    setSpeaker(sermon.speaker);
    
    // Convert Firestore Timestamp to YYYY-MM-DD
    let formattedDate = "";
    if (sermon.date) {
      const d = sermon.date.toDate();
      formattedDate = d.toISOString().split("T")[0];
    }
    setDateStr(formattedDate);

    setImageUrl(sermon.imageUrl || "");
    setAudioUrl(sermon.audioUrl || "");
    setVideoUrl(sermon.videoUrl || "");
    setCategory(sermon.category || "");
    setIsActive(sermon.isActive);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !speaker || !dateStr) {
      setError("Title, Speaker, and Date are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Convert date string back to Firestore Timestamp
    const dateObj = new Date(dateStr + "T12:00:00"); // Noon to avoid timezone shifts
    const firestoreTimestamp = Timestamp.fromDate(dateObj);

    const sermonData = {
      title,
      description,
      speaker,
      date: firestoreTimestamp,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      videoUrl: videoUrl || null,
      category: category || null,
      isActive,
      updatedAt: serverTimestamp(),
    };

    try {
      if (modalType === "add") {
        await addDoc(collection(db, "sermons"), {
          ...sermonData,
          createdAt: serverTimestamp(),
        });
      } else {
        if (currentSermon.id) {
          await updateDoc(doc(db, "sermons", currentSermon.id), sermonData);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error saving sermon:", err);
      setError("Failed to save sermon. Please check database permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sermon permanently?")) return;
    try {
      if (playingSermonId === id) {
        stopAudio();
      }
      await deleteDoc(doc(db, "sermons", id));
    } catch (err) {
      console.error("Error deleting sermon:", err);
      alert("Failed to delete sermon. Check permissions.");
    }
  };

  const handleToggleActive = async (sermon: Sermon) => {
    try {
      await updateDoc(doc(db, "sermons", sermon.id), {
        isActive: !sermon.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
    }
  };

  // Preview Audio Player Controls
  const togglePlayAudio = (sermon: Sermon) => {
    if (!sermon.audioUrl) return;

    if (playingSermonId === sermon.id) {
      stopAudio();
    } else {
      playAudio(sermon.id, sermon.audioUrl);
    }
  };

  const playAudio = (id: string, url: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    audio.play()
      .then(() => {
        setPlayingSermonId(id);
      })
      .catch((err) => {
        console.error("Failed to play audio preview:", err);
        alert("Unable to play audio. Verify Cloudinary audio URL.");
      });

    audio.onended = () => {
      setPlayingSermonId(null);
    };
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingSermonId(null);
  };

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const formatDate = (firestoreTimestamp: Timestamp) => {
    if (!firestoreTimestamp) return "";
    return firestoreTimestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-sm font-medium tracking-wide">Syncing sermons collection...</p>
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

      {/* Upper Filter & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-text">Overview & Controls</p>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Sermons Archive ({sermons.length})
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search speaker, series, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-2xl border border-slate-900 bg-slate-950/50 pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-slate-100 transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer shrink-0"
          >
            <Plus className="h-4.5 w-4.5" /> Add Sermon
          </button>
        </div>
      </div>

      {/* Sermons Data Display */}
      {filteredSermons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <FileVideo className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              {searchQuery ? "No Match Found" : "No Sermons Found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery 
                ? "Try adjusting your search query, or clear it to view all items." 
                : "Archive your first church sermon with sermon details, speaker names, audio, and thumbnail previews."}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-800 transition-all"
            >
              Upload First Sermon
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSermons.map((sermon) => (
            <div 
              key={sermon.id}
              className="rounded-3xl border border-slate-900 bg-slate-950/40 overflow-hidden flex flex-col justify-between hover:border-slate-800/80 transition-all group"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden border-b border-slate-900">
                {sermon.imageUrl ? (
                  <img 
                    src={sermon.imageUrl} 
                    alt={sermon.title} 
                    className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-655">
                    <FileVideo className="h-10 w-10" />
                  </div>
                )}

                {/* Floating Category Tag */}
                {sermon.category && (
                  <div className="absolute top-4 left-4 rounded-xl bg-slate-950/80 border border-slate-900/60 px-3 py-1 text-[9px] font-bold text-indigo-300 uppercase tracking-wider backdrop-blur-md">
                    {sermon.category}
                  </div>
                )}

                {/* Visibility Toggle Badge */}
                <button
                  onClick={() => handleToggleActive(sermon)}
                  className={`absolute top-4 right-4 rounded-xl px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 ${
                    sermon.isActive 
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                      : "text-slate-400 bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sermon.isActive ? "bg-emerald-400" : "bg-slate-400"}`}></span>
                  {sermon.isActive ? "Active" : "Draft"}
                </button>

                {/* Audio Playing Floating Player Controls */}
                {sermon.audioUrl && (
                  <button
                    onClick={() => togglePlayAudio(sermon)}
                    className={`absolute bottom-4 right-4 h-9 w-9 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                      playingSermonId === sermon.id
                        ? "bg-pink-600 text-slate-100 border-pink-500 animate-pulse"
                        : "bg-slate-950/70 border-slate-900/60 text-indigo-400 hover:text-indigo-300"
                    }`}
                    title={playingSermonId === sermon.id ? "Pause Audio Preview" : "Play Audio Preview"}
                  >
                    {playingSermonId === sermon.id ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-current ml-0.5" />}
                  </button>
                )}
              </div>

              {/* Title & Info Panel */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-200 tracking-tight line-clamp-1" title={sermon.title}>
                    {sermon.title}
                  </h3>
                  
                  {/* Metadata labels */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-400 truncate max-w-[120px]" title={sermon.speaker}>
                      <UserIcon className="h-3 w-3 text-indigo-400 shrink-0" /> {sermon.speaker}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <CalendarIcon className="h-3 w-3 text-pink-400 shrink-0" /> {formatDate(sermon.date)}
                    </span>
                  </div>

                  {sermon.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2" title={sermon.description}>
                      {sermon.description}
                    </p>
                  )}
                </div>

                {/* Bottom Details Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-900/60 text-[10px]">
                  <div className="flex items-center gap-2">
                    {sermon.audioUrl && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-pink-400 bg-pink-500/5 px-2 py-0.5 rounded-md border border-pink-500/10">
                        <Music className="h-2.5 w-2.5" /> Audio
                      </span>
                    )}
                    {sermon.videoUrl && (
                      <a 
                        href={sermon.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10 hover:text-indigo-300"
                      >
                        Video <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => openEditModal(sermon)}
                      className="p-2 rounded-xl text-slate-450 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100 transition-colors"
                      title="Edit Sermon Details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sermon.id)}
                      className="p-2 rounded-xl text-slate-450 border border-slate-900 hover:border-red-950 hover:bg-red-500/5 hover:text-red-400 transition-colors"
                      title="Delete Sermon"
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

      {/* CRUD MODAL FOR ADDING/EDITING SERMONS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {modalType === "add" ? "Archive New Sermon" : "Edit Sermon Details"}
                </h3>
                <p className="text-[10px] text-slate-500">Provide details for the sermon library</p>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Sermon Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Living in Abundant Grace"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Speaker Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Speaker / Pastor *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Pastor David Shammah"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Preach Date *
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Category/Series Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                    Category / Series Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grace Series"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                  Sermon Outline / Description
                </label>
                <textarea
                  placeholder="Detailed outline or scriptures referenced in this sermon..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all min-h-[70px]"
                />
              </div>

              {/* Media Uploaders in split grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-slate-850 bg-slate-950/30 rounded-2xl">
                {/* Thumbnail Image Uploader */}
                <CloudinaryUpload 
                  fileType="image"
                  onUploadSuccess={(url) => setImageUrl(url)}
                  initialUrl={imageUrl}
                  label="Sermon Thumbnail (.png)"
                />

                {/* Audio File Uploader */}
                <CloudinaryUpload 
                  fileType="audio"
                  onUploadSuccess={(url) => setAudioUrl(url)}
                  initialUrl={audioUrl}
                  label="Audio Sermon (.mp3 or .wav)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Video Link */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Video Stream URL (YouTube/Vimeo)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>

                {/* Visibility Status */}
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
                      Publish active in archive
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
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
                    "Save Sermon"
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
