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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  X,
  AlertTriangle,
  BookOpen,
  Compass,
  Eye,
  Group,
  Library,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type: "reflection" | "study" | "mission" | "vision" | "aboutus";
  url?: string | null;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const RESOURCE_TYPES = [
  {
    value: "reflection",
    label: "Reflection",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    icon: Sparkles,
  },
  {
    value: "study",
    label: "Study",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    icon: BookOpen,
  },
  {
    value: "mission",
    label: "Mission",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Compass,
  },
  {
    value: "vision",
    label: "Vision",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: Eye,
  },
  {
    value: "aboutus",
    label: "About Us",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: Group,
  },
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number]["value"];

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentResource, setCurrentResource] = useState<Partial<Resource>>({});

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>("study");
  const [url, setUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    const q = collection(db, "resources");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        }) as Resource[];

        // Client-side sort by createdAt descending (fallback to title)
        list.sort((a, b) => {
          const secondsA = a.createdAt?.seconds || 0;
          const secondsB = b.createdAt?.seconds || 0;
          if (secondsA !== secondsB) return secondsB - secondsA;
          return a.title.localeCompare(b.title);
        });

        setResources(list);
        setSyncError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore sync error:", err);
        setSyncError("Connection failed: " + err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Filter logic (Search query + Type dropdown filter)
  useEffect(() => {
    const queryLower = searchQuery ? searchQuery.toLowerCase() : "";
    const result = resources.filter((r) => {
      const matchesSearch =
        (r.title && r.title.toLowerCase().includes(queryLower)) ||
        (r.description && r.description.toLowerCase().includes(queryLower)) ||
        (r.url && r.url.toLowerCase().includes(queryLower));

      const matchesType =
        selectedTypeFilter === "all" ||
        (r.type && r.type === selectedTypeFilter);

      return matchesSearch && matchesType;
    });
    setFilteredResources(result);
  }, [searchQuery, selectedTypeFilter, resources]);

  const resetForm = () => {
    setCurrentResource({});
    setTitle("");
    setDescription("");
    setType("study");
    setUrl("");
    setIsActive(true);
    setError(null);
  };

  const openAddModal = () => {
    setModalType("add");
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (resource: Resource) => {
    setModalType("edit");
    setCurrentResource(resource);
    setTitle(resource.title);
    setDescription(resource.description || "");
    setType((resource.type as ResourceType) || "study");
    setUrl(resource.url || "");
    setIsActive(resource.isActive);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) {
      setError("Title and Type are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const resourceData = {
      title: title.trim(),
      description: description.trim(),
      type,
      url: url.trim() || null,
      isActive,
      updatedAt: serverTimestamp(),
    };

    try {
      if (modalType === "add") {
        await addDoc(collection(db, "resources"), {
          ...resourceData,
          createdAt: serverTimestamp(),
        });
      } else {
        if (currentResource.id) {
          await updateDoc(doc(db, "resources", currentResource.id), resourceData);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error saving resource:", err);
      setError("Failed to save resource. Please check database permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource permanently?")) return;
    try {
      await deleteDoc(doc(db, "resources", id));
    } catch (err) {
      console.error("Error deleting resource:", err);
      alert("Failed to delete resource. Check permissions.");
    }
  };

  const handleToggleActive = async (resource: Resource) => {
    try {
      await updateDoc(doc(db, "resources", resource.id), {
        isActive: !resource.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
    }
  };

  const getTypeDetails = (typeVal: string) => {
    const details = RESOURCE_TYPES.find((t) => t.value === typeVal);
    return (
      details || {
        label: typeVal,
        color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
        icon: Library,
      }
    );
  };

  const formatDate = (firestoreTimestamp?: Timestamp) => {
    if (!firestoreTimestamp) return "Just now";
    return firestoreTimestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getHostname = (rawUrl: string) => {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, "");
    } catch {
      return rawUrl;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-sm font-medium tracking-wide">Syncing resources collection...</p>
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

      {/* Filter and Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-text">Overview & Controls</p>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Resources Library ({resources.length})
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Type Filter Select */}
          <div className="relative">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full sm:w-44 rounded-2xl border border-slate-900 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all" className="bg-slate-950">All Types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-950">
                  {t.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search resource title, url..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-2xl border border-slate-900 bg-slate-950/50 pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-slate-100 transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer shrink-0"
          >
            <Plus className="h-4.5 w-4.5" /> Add Resource
          </button>
        </div>
      </div>

      {/* Resources List */}
      {filteredResources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Library className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              {searchQuery || selectedTypeFilter !== "all"
                ? "No Match Found"
                : "No Resources Found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedTypeFilter !== "all"
                ? "Try adjusting your filters, or clear them to view all items."
                : "Curate reflections, studies, mission briefs, and vision documents for your community."}
            </p>
          </div>
          {selectedTypeFilter === "all" && !searchQuery && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-800 transition-all"
            >
              Add First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const typeDetails = getTypeDetails(resource.type);
            const IconComponent = typeDetails.icon;

            return (
              <div
                key={resource.id}
                className="rounded-3xl border border-slate-900 bg-slate-950/40 overflow-hidden flex flex-col justify-between hover:border-slate-800/80 transition-all group"
              >
                {/* Header / Type Banner */}
                <div className="relative w-full bg-gradient-to-br from-slate-900/80 to-slate-950 overflow-hidden border-b border-slate-900 p-5">
                  <div className="flex items-center justify-between mb-4">
                    {/* Type Tag */}
                    <div
                      className={`rounded-xl border px-3 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${typeDetails.color}`}
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                      {typeDetails.label}
                    </div>

                    {/* Visibility Status Badge */}
                    <button
                      onClick={() => handleToggleActive(resource)}
                      className={`rounded-xl px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 ${
                        resource.isActive
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-slate-400 bg-slate-900/40 border-slate-800"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          resource.isActive ? "bg-emerald-400" : "bg-slate-400"
                        }`}
                      ></span>
                      {resource.isActive ? "Active" : "Draft"}
                    </button>
                  </div>

                  {/* Big icon as visual anchor */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${typeDetails.color}`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm font-bold text-slate-100 tracking-tight line-clamp-2"
                        title={resource.title}
                      >
                        {resource.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    {resource.description && (
                      <p
                        className="text-[11px] text-slate-400 line-clamp-3"
                        title={resource.description}
                      >
                        {resource.description}
                      </p>
                    )}

                    {/* URL link */}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-950/50 px-3 py-2 hover:border-indigo-500/30 hover:bg-slate-900 transition-colors group/link"
                      >
                        <LinkIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span
                          className="text-[10px] font-semibold text-slate-300 truncate flex-1"
                          title={resource.url}
                        >
                          {getHostname(resource.url)}
                        </span>
                        <ExternalLink className="h-3 w-3 text-slate-500 group-hover/link:text-indigo-400 transition-colors" />
                      </a>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="font-medium">
                        Added {formatDate(resource.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-900/60">
                    <button
                      onClick={() => openEditModal(resource)}
                      className="p-2 rounded-xl text-slate-400 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100 transition-colors"
                      title="Edit Resource"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-2 rounded-xl text-slate-400 border border-slate-900 hover:border-red-950 hover:bg-red-500/5 hover:text-red-400 transition-colors"
                      title="Delete Resource"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRUD MODAL FOR ADDING/EDITING RESOURCES */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {modalType === "add" ? "Add New Resource" : "Edit Resource Details"}
                </h3>
                <p className="text-[10px] text-slate-500">
                  Provide details for the resources library
                </p>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Title Field */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Walking in the Spirit"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Type Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ResourceType)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all cursor-pointer"
                    required
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-950">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* URL Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                  External URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/resource"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                  Description (optional)
                </label>
                <textarea
                  placeholder="A short summary of what this resource covers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all min-h-[90px]"
                />
              </div>

              {/* Visibility Status */}
              <div className="space-y-1.5 flex flex-col justify-end pt-1">
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
                    Publish resource in library
                  </span>
                </label>
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
                    "Save Resource"
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
