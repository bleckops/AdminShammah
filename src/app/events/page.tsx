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
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Search,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  X,
  AlertTriangle,
  Gift,
  Compass,
  Tent,
  Flame,
  Sparkles,
  Megaphone,
  CheckCircle2
} from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";

interface Event {
  id: string;
  title: string;
  description: string;
  type: "birthdays" | "retreat" | "camp" | "prayer" | "social" | "evangelism";
  date: Timestamp;
  time?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const EVENT_TYPES = [
  { value: "birthdays", label: "Birthday", color: "text-pink-400 bg-pink-500/10 border-pink-500/20", icon: Gift },
  { value: "retreat", label: "Retreat", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: Compass },
  { value: "camp", label: "Camp", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Tent },
  { value: "prayer", label: "Prayer", color: "text-violet-400 bg-violet-500/10 border-violet-500/20", icon: Flame },
  { value: "social", label: "Social", color: "text-sky-400 bg-sky-500/10 border-sky-500/20", icon: Sparkles },
  { value: "evangelism", label: "Evangelism", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: Megaphone },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({});

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Event["type"]>("birthdays");
  const [dateStr, setDateStr] = useState(""); // YYYY-MM-DD format
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    const q = collection(db, "events");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as Event[];
      
      // Sort by date descending
      list.sort((a, b) => {
        const secondsA = a.date?.seconds || 0;
        const secondsB = b.date?.seconds || 0;
        return secondsB - secondsA;
      });
      
      setEvents(list);
      setSyncError(null);
      setLoading(false);
    }, (err) => {
      console.error("Firestore sync error:", err);
      setSyncError("Connection failed: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter logic (Search query + Type dropdown filter)
  useEffect(() => {
    const queryLower = searchQuery ? searchQuery.toLowerCase() : "";
    const result = events.filter((e) => {
      const matchesSearch = 
        (e.title && e.title.toLowerCase().includes(queryLower)) ||
        (e.description && e.description.toLowerCase().includes(queryLower)) ||
        (e.location && e.location.toLowerCase().includes(queryLower));

      const matchesType = 
        selectedTypeFilter === "all" || (e.type && e.type === selectedTypeFilter);

      return matchesSearch && matchesType;
    });
    setFilteredEvents(result);
  }, [searchQuery, selectedTypeFilter, events]);

  const openAddModal = () => {
    setModalType("add");
    setCurrentEvent({});
    setTitle("");
    setDescription("");
    setType("birthdays");
    
    // Default today date format YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    setDateStr(today);
    setTime("");
    setLocation("");
    setImageUrl("");
    setIsActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setModalType("edit");
    setCurrentEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setType(event.type);
    
    // Convert Firestore Timestamp to YYYY-MM-DD
    let formattedDate = "";
    if (event.date) {
      const d = event.date.toDate();
      formattedDate = d.toISOString().split("T")[0];
    }
    setDateStr(formattedDate);
    setTime(event.time || "");
    setLocation(event.location || "");
    setImageUrl(event.imageUrl || "");
    setIsActive(event.isActive);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type || !dateStr) {
      setError("Title, Event Type, and Date are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Convert date string back to Firestore Timestamp
    const dateObj = new Date(dateStr + "T12:00:00"); // Noon to avoid timezone shifts
    const firestoreTimestamp = Timestamp.fromDate(dateObj);

    const eventData = {
      title,
      description,
      type,
      date: firestoreTimestamp,
      time: time || null,
      location: location || null,
      imageUrl: imageUrl || null,
      isActive,
      updatedAt: serverTimestamp(),
    };

    try {
      if (modalType === "add") {
        await addDoc(collection(db, "events"), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
      } else {
        if (currentEvent.id) {
          await updateDoc(doc(db, "events", currentEvent.id), eventData);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error saving event:", err);
      setError("Failed to save event. Please check database permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event permanently?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event. Check permissions.");
    }
  };

  const handleToggleActive = async (event: Event) => {
    try {
      await updateDoc(doc(db, "events", event.id), {
        isActive: !event.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
    }
  };

  const formatDate = (firestoreTimestamp: Timestamp) => {
    if (!firestoreTimestamp) return "";
    return firestoreTimestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeDetails = (typeVal: string) => {
    const details = EVENT_TYPES.find((t) => t.value === typeVal);
    return details || { label: typeVal, color: "text-slate-400 bg-slate-500/10 border-slate-500/20", icon: CalendarIcon };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-sm font-medium tracking-wide">Syncing events collection...</p>
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
            Events Board ({events.length})
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
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-950">
                  {t.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search event title, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-2xl border border-slate-900 bg-slate-950/50 pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-slate-100 transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer shrink-0"
          >
            <Plus className="h-4.5 w-4.5" /> Add Event
          </button>
        </div>
      </div>

      {/* Events Board List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <CalendarIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              {searchQuery || selectedTypeFilter !== "all" ? "No Match Found" : "No Events Scheduled"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedTypeFilter !== "all"
                ? "Try adjusting your filters, or clear them to view all items." 
                : "Schedule camp meetings, birthdays, retreats, prayers, socials, or evangelism drives."}
            </p>
          </div>
          {selectedTypeFilter === "all" && !searchQuery && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-800 transition-all"
            >
              Schedule First Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const typeDetails = getTypeDetails(event.type);
            const IconComponent = typeDetails.icon;

            return (
              <div 
                key={event.id}
                className="rounded-3xl border border-slate-900 bg-slate-950/40 overflow-hidden flex flex-col justify-between hover:border-slate-800/80 transition-all group"
              >
                {/* Event Image Banner / Preview */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden border-b border-slate-900">
                  {event.imageUrl ? (
                    <img 
                      src={event.imageUrl} 
                      alt={event.title} 
                      className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700 bg-slate-950/20">
                      <IconComponent className="h-12 w-12 text-slate-600" />
                    </div>
                  )}

                  {/* Floating Category Tag */}
                  <div className={`absolute top-4 left-4 rounded-xl border px-3 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 ${typeDetails.color}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                    {typeDetails.label}
                  </div>

                  {/* Visibility Status Badge */}
                  <button
                    onClick={() => handleToggleActive(event)}
                    className={`absolute top-4 right-4 rounded-xl px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 ${
                      event.isActive 
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                        : "text-slate-400 bg-slate-900/40 border-slate-800"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${event.isActive ? "bg-emerald-400" : "bg-slate-400"}`}></span>
                    {event.isActive ? "Active" : "Draft"}
                  </button>
                </div>

                {/* Title & Info Panel */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-200 tracking-tight line-clamp-1" title={event.title}>
                      {event.title}
                    </h3>
                    
                    {/* Metadata indicators */}
                    <div className="flex flex-col gap-1.5 text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="font-semibold text-slate-350">{formatDate(event.date)}</span>
                      </div>
                      
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                          <span className="font-medium">{event.time}</span>
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                          <span className="font-medium truncate max-w-[200px]" title={event.location}>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 pt-1" title={event.description}>
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-900/60">
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-2 rounded-xl text-slate-400 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100 transition-colors"
                      title="Edit Event Details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 rounded-xl text-slate-400 border border-slate-900 hover:border-red-950 hover:bg-red-500/5 hover:text-red-400 transition-colors"
                      title="Delete Event"
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

      {/* CRUD MODAL FOR ADDING/EDITING EVENTS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {modalType === "add" ? "Schedule New Event" : "Edit Event Details"}
                </h3>
                <p className="text-[10px] text-slate-500">Provide details for the event registry</p>
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
                    Event Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Youth Retreat"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Event Type Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Event Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Event["type"])}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all cursor-pointer"
                    required
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-950">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Date Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Time Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Event Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 6:00 PM - 8:30 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>

                {/* Location Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-350">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Fellowship Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-355">
                  Description / Event Details
                </label>
                <textarea
                  placeholder="Details, schedules, speakers, or items to bring..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all min-h-[70px]"
                />
              </div>

              {/* Image Uploader */}
              <div className="p-4 border border-slate-850 bg-slate-950/30 rounded-2xl">
                <CloudinaryUpload 
                  fileType="image"
                  onUploadSuccess={(url) => setImageUrl(url)}
                  initialUrl={imageUrl}
                  label="Event Promotional Image (.png or .jpg)"
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
                    Publish event directly
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
                    "Save Event"
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
