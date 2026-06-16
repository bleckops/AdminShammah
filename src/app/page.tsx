"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  limit, 
  orderBy, 
  query, 
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
  FileVideo, 
  Image as ImageIcon, 
  Users, 
  Activity,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Gift,
  Compass,
  Tent,
  Flame,
  Sparkles,
  Megaphone
} from "lucide-react";
import Link from "next/link";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
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

// Mock analytics data for premium chart aesthetic
const uploadTrendsData = [
  { month: "Jan", uploads: 2 },
  { month: "Feb", uploads: 5 },
  { month: "Mar", uploads: 3 },
  { month: "Apr", uploads: 8 },
  { month: "May", uploads: 6 },
  { month: "Jun", uploads: 12 },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBanners: 0,
    activeBanners: 0,
    totalSermons: 0,
    activeSermons: 0,
    uniqueSpeakers: 0,
  });
  const [recentSermons, setRecentSermons] = useState<any[]>([]);
  const [recentBanners, setRecentBanners] = useState<any[]>([]);

  // Events & Calendar States
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Event Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Event["type"]>("birthdays");
  const [dateStr, setDateStr] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Dashboard Metrics (Banners, Sermons)
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Fetch Banners
        const bannersSnap = await getDocs(collection(db, "banners"));
        const banners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeBannersCount = banners.filter((b: any) => b.isActive).length;

        // Fetch Sermons
        const sermonsSnap = await getDocs(collection(db, "sermons"));
        const sermons = sermonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeSermonsCount = sermons.filter((s: any) => s.isActive).length;

        // Calculate unique speakers
        const speakers = new Set(sermons.map((s: any) => s.speaker).filter(Boolean));

        setStats({
          totalBanners: banners.length,
          activeBanners: activeBannersCount,
          totalSermons: sermons.length,
          activeSermons: activeSermonsCount,
          uniqueSpeakers: speakers.size,
        });

        // Set recent items by date if available, or slice
        const recentS = [...sermons]
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 3);
        const recentB = [...banners]
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 3);

        setRecentSermons(recentS);
        setRecentBanners(recentB);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Fetch Events Real-time Sync
  useEffect(() => {
    const q = collection(db, "events");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(list);
      setEventsError(null);
      setEventsLoading(false);
    }, (err) => {
      console.error("Dashboard events sync error:", err);
      setEventsError("Failed to sync calendar events.");
      setEventsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync selected event when events update (e.g. edited elsewhere or deleted)
  useEffect(() => {
    if (selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated) {
        setSelectedEvent(updated);
      } else {
        setSelectedEvent(null);
      }
    }
  }, [events]);

  // Date Utilities
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const eventMatchesDay = (event: Event, dayDate: Date) => {
    if (!event.date) return false;
    const eventDate = event.date.toDate();
    
    if (event.type === "birthdays") {
      return (
        eventDate.getMonth() === dayDate.getMonth() &&
        eventDate.getDate() === dayDate.getDate() &&
        eventDate.getFullYear() <= dayDate.getFullYear()
      );
    }
    
    return isSameDay(eventDate, dayDate);
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month leading days to fill exactly 42 blocks (6 weeks grid)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDaySelect = (dayDate: Date) => {
    setSelectedDate(dayDate);
    // Find if the currently selected event is on this day; if not, clear selectedEvent
    if (selectedEvent) {
      if (!eventMatchesDay(selectedEvent, dayDate)) {
        setSelectedEvent(null);
      }
    }
  };

  // Event handlers
  const openAddModal = (initialDate?: Date) => {
    setModalType("add");
    setTitle("");
    setDescription("");
    setType("birthdays");
    
    // Default to the provided date or today in local format YYYY-MM-DD
    const targetDate = initialDate || new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    setDateStr(`${year}-${month}-${day}`);
    
    setTime("");
    setLocation("");
    setImageUrl("");
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setModalType("edit");
    setTitle(event.title);
    setDescription(event.description || "");
    setType(event.type);
    
    let formattedDate = "";
    if (event.date) {
      const d = event.date.toDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}`;
    }
    setDateStr(formattedDate);
    setTime(event.time || "");
    setLocation(event.location || "");
    setImageUrl(event.imageUrl || "");
    setIsActive(event.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type || !dateStr) {
      setFormError("Title, Event Type, and Date are required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const dateObj = new Date(dateStr + "T12:00:00");
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
        if (selectedEvent?.id) {
          await updateDoc(doc(db, "events", selectedEvent.id), eventData);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error saving event on dashboard calendar:", err);
      setFormError("Failed to save event. Check permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event permanently?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Error deleting event from dashboard calendar:", err);
      alert("Failed to delete event. Check permissions.");
    }
  };

  // Get active day's events
  const getTypeDetails = (typeVal: string) => {
    const details = EVENT_TYPES.find((t) => t.value === typeVal);
    return details || { label: typeVal, color: "text-slate-400 bg-slate-500/10 border-slate-500/20", icon: Calendar };
  };

  const formatDate = (firestoreTimestamp: Timestamp) => {
    if (!firestoreTimestamp) return "";
    return firestoreTimestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const selectedDayEvents = events.filter(e => {
    return eventMatchesDay(e, selectedDate);
  });

  const getEventTypesForDay = (dayDate: Date) => {
    const dayEvents = events.filter(e => eventMatchesDay(e, dayDate));
    // Unique event types on this day
    return Array.from(new Set(dayEvents.map(e => e.type)));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-sm font-medium tracking-wide">Assembling dashboard metrics...</p>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Sermons",
      value: stats.totalSermons,
      sub: `${stats.activeSermons} active online`,
      icon: FileVideo,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Total Banners",
      value: stats.totalBanners,
      sub: `${stats.activeBanners} visible online`,
      icon: ImageIcon,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Active Speakers",
      value: stats.uniqueSpeakers,
      sub: "Preachers & Guests",
      icon: Users,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      title: "Upload Activity",
      value: stats.totalSermons + stats.totalBanners,
      sub: "Total managed items",
      icon: Activity,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      
      {/* Welcome Banner */}
      <div className="rounded-3xl glass-panel bg-slate-900/30 p-8 border border-slate-800/80 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 space-y-2 text-center md:text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            System Operational
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            Welcome to Shammah Control Center
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl">
            You are successfully connected to project <code className="text-indigo-300 font-mono">shammah-cf23e</code>. 
            Add sermons, upload banners to Cloudinary, and manage your online content in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href="/banners"
            className="flex items-center gap-1.5 rounded-2xl border border-slate-800 hover:bg-slate-900 px-5 py-3 text-xs font-bold text-slate-200 transition-all active:scale-95"
          >
            <ImageIcon className="h-4 w-4" /> Banners
          </Link>
          <Link
            href="/sermons"
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-slate-100 transition-all active:scale-95 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="h-4 w-4" /> New Sermon
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx}
              className="rounded-2xl border border-slate-900 bg-slate-950/40 p-5 flex items-center justify-between hover:border-slate-800/80 transition-colors"
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                  {kpi.value}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 block">
                  {kpi.sub}
                </span>
              </div>
              <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 ${kpi.color}`}>
                <Icon className="h-5.5 w-5.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Charts & Stat Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Analytics Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Media Activity</h3>
              <p className="text-[10px] text-slate-500">Track upload counts over the last six months</p>
            </div>
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              Monthly Trend
            </span>
          </div>

          <div className="h-[200px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uploadTrendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadsColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#f8fafc", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="uploads" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#uploadsColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Database Overview */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-6 flex flex-col space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Database Summary</h3>
            <p className="text-[10px] text-slate-500">Status breakdown of your Firestore database</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-4.5">
            {/* Sermons Status */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-350 flex items-center gap-1.5">
                  <FileVideo className="h-4 w-4 text-emerald-400" /> Sermons Active Ratio
                </span>
                <span className="text-slate-200">
                  {stats.totalSermons > 0 ? Math.round((stats.activeSermons / stats.totalSermons) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${stats.totalSermons > 0 ? (stats.activeSermons / stats.totalSermons) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Banners Status */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-350 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-400" /> Banners Active Ratio
                </span>
                <span className="text-slate-200">
                  {stats.totalBanners > 0 ? Math.round((stats.activeBanners / stats.totalBanners) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full" 
                  style={{ width: `${stats.totalBanners > 0 ? (stats.activeBanners / stats.totalBanners) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-900 flex items-center gap-2.5 text-[11px] text-slate-500">
              <Layers className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Standard indexes configured on Firestore collections for fast client query performance.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events Calendar Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Events Calendar</h2>
          <p className="text-[10px] text-slate-500">Track, schedule, and coordinate church events from the monthly matrix</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Month Calendar Grid (col-span-2) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-950/40 p-6 flex flex-col space-y-4">
            
            {/* Header controls */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-900/60">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                {eventsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-xl border border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-[10px] font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Today
                </button>
                <button 
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-xl border border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekdays row */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {getDaysInMonth(currentMonth).map(({ date: dayDate, isCurrentMonth }, idx) => {
                const dayEvents = events.filter(e => eventMatchesDay(e, dayDate));
                const activeDayEventsCount = dayEvents.length;
                const isDaySelected = isSameDay(dayDate, selectedDate);
                const isDayToday = isToday(dayDate);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDaySelect(dayDate)}
                    className={`aspect-[4/3] sm:aspect-video rounded-xl p-1.5 border flex flex-col justify-between items-start transition-all relative group cursor-pointer ${
                      isCurrentMonth 
                        ? "bg-slate-950/20 text-slate-200" 
                        : "bg-slate-950/5 text-slate-600 opacity-40 hover:opacity-70"
                    } ${
                      isDaySelected 
                        ? "border-indigo-500/80 bg-indigo-500/5 shadow-md shadow-indigo-500/5" 
                        : "border-slate-900 hover:border-slate-800 hover:bg-slate-900/20"
                    }`}
                  >
                    {/* Day number & today marker */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] sm:text-xs font-bold leading-none ${
                        isDayToday 
                          ? "text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20" 
                          : ""
                      }`}>
                        {dayDate.getDate()}
                      </span>
                      {activeDayEventsCount > 0 && (
                        <span className="text-[8px] font-extrabold text-indigo-400 bg-indigo-500/10 h-3.5 px-1 rounded-md border border-indigo-500/25 flex items-center justify-center scale-90 sm:scale-100 animate-fadeIn">
                          {activeDayEventsCount}
                        </span>
                      )}
                    </div>

                    {/* Category Indicators */}
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1 w-full max-h-[16px] overflow-hidden">
                      {getEventTypesForDay(dayDate).map((tVal, dotIdx) => {
                        // Map type color to dot color
                        let dotBg = "bg-slate-500";
                        if (tVal === "birthdays") dotBg = "bg-pink-400";
                        else if (tVal === "retreat") dotBg = "bg-emerald-400";
                        else if (tVal === "camp") dotBg = "bg-amber-400";
                        else if (tVal === "prayer") dotBg = "bg-violet-400";
                        else if (tVal === "social") dotBg = "bg-sky-400";
                        else if (tVal === "evangelism") dotBg = "bg-rose-400";

                        const label = EVENT_TYPES.find(et => et.value === tVal)?.label || tVal;

                        return (
                          <span 
                            key={dotIdx}
                            className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0 ${dotBg}`}
                            title={label}
                          />
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Panel (col-span-1) */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-6 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4 flex-1">
              {/* Header */}
              <div className="pb-3 border-b border-slate-900/60">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Agenda Planner</span>
                <h3 className="text-xs font-extrabold text-slate-100 mt-0.5">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </h3>
              </div>

              {/* Event details view OR list view */}
              {selectedEvent ? (() => {
                const eventTypeInfo = getTypeDetails(selectedEvent.type);
                const EventIcon = eventTypeInfo.icon;
                return (
                  /* DETAILED VIEW OF SPECIFIC EVENT */
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Back button to roster */}
                    {selectedDayEvents.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Back to Daily roster
                      </button>
                    )}

                    {/* Image banner or fallback category card */}
                    <div className="relative aspect-video w-full bg-slate-955 rounded-xl overflow-hidden border border-slate-900">
                      {selectedEvent.imageUrl ? (
                        <img src={selectedEvent.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-indigo-500/5 text-slate-600">
                          <EventIcon className="h-10 w-10 text-slate-700" />
                        </div>
                      )}
                      
                      {/* Category badge */}
                      <div className={`absolute top-3 left-3 rounded-lg border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1 ${eventTypeInfo.color}`}>
                        <EventIcon className="h-3 w-3" />
                        {eventTypeInfo.label}
                      </div>

                      {/* Visibility status */}
                      <span className={`absolute top-3 right-3 rounded-lg px-2 py-0.5 text-[8px] font-bold border backdrop-blur-md ${
                        selectedEvent.isActive 
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                          : "text-slate-400 bg-slate-900/40 border-slate-800"
                      }`}>
                        {selectedEvent.isActive ? "Published" : "Draft"}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-200 leading-tight">
                        {selectedEvent.title}
                      </h4>

                      <div className="flex flex-col gap-1.5 text-[10px] text-slate-500">
                        {selectedEvent.time && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-pink-400" />
                            <span>{selectedEvent.time}</span>
                          </div>
                        )}
                        {selectedEvent.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-teal-400" />
                            <span className="truncate">{selectedEvent.location}</span>
                          </div>
                        )}
                      </div>

                      {selectedEvent.description && (
                        <p className="text-[10px] text-slate-505 leading-relaxed pt-1 whitespace-pre-line border-t border-slate-900/40">
                          {selectedEvent.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedEvent)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-900 hover:border-slate-800 hover:bg-slate-900 py-2 text-[10px] font-bold text-slate-350 hover:text-slate-200 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-900 hover:border-red-955 hover:bg-red-500/5 py-2 text-[10px] font-bold text-slate-350 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })() : selectedDayEvents.length > 0 ? (
                /* LIST VIEW OF THE DAY'S EVENTS */
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 animate-fadeIn">
                  {selectedDayEvents.map((evt) => {
                    const typeInfo = getTypeDetails(evt.type);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full text-left flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-900/10 p-2.5 hover:border-slate-800 hover:bg-slate-900/20 transition-all cursor-pointer"
                      >
                        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${typeInfo.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold text-slate-200 truncate">{evt.title}</h4>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                            {evt.time && <span className="truncate">{evt.time}</span>}
                            {evt.location && <span className="truncate">@ {evt.location}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* EMPTY STATE FOR THE DAY */
                <div className="py-8 text-center space-y-3 border border-dashed border-slate-900 rounded-2xl animate-fadeIn">
                  <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-650 mx-auto">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-300">Quiet Day</h4>
                    <p className="text-[9px] text-slate-600 max-w-[150px] mx-auto mt-0.5">No church events scheduled for this date.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Event trigger */}
            {(!selectedEvent || selectedDayEvents.length > 1) && (
              <button
                type="button"
                onClick={() => openAddModal(selectedDate)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-[10px] font-bold text-slate-100 transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Items Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Recent Banners */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Recent Banners</h3>
            <Link 
              href="/banners"
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 group"
            >
              Manage all <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentBanners.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-xl">
                <p className="text-xs text-slate-500">No banners configured yet.</p>
              </div>
            ) : (
              recentBanners.map((banner, idx) => (
                <div 
                  key={banner.id || idx}
                  className="flex items-center gap-4 rounded-xl border border-slate-900 bg-slate-900/10 p-3 hover:border-slate-850 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-600 bg-slate-950/20">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{banner.title}</h4>
                    <p className="text-[10px] text-slate-505 mt-0.5">Order Sequence: {banner.order || 0}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                    banner.isActive 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                      : "text-slate-500 bg-slate-500/5 border-slate-850"
                  }`}>
                    {banner.isActive ? "Active" : "Draft"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sermons */}
        <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Recent Sermons</h3>
            <Link 
              href="/sermons"
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 group"
            >
              Manage all <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentSermons.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-xl">
                <p className="text-xs text-slate-500">No sermons configured yet.</p>
              </div>
            ) : (
              recentSermons.map((sermon, idx) => (
                <div 
                  key={sermon.id || idx}
                  className="flex items-center gap-4 rounded-xl border border-slate-900 bg-slate-900/10 p-3 hover:border-slate-850 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                    {sermon.imageUrl ? (
                      <img src={sermon.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-600 bg-slate-950/20">
                        <FileVideo className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{sermon.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-400 truncate">{sermon.speaker}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                    sermon.isActive 
                      ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                      : "text-slate-500 bg-slate-500/5 border-slate-850"
                  }`}>
                    {sermon.isActive ? "Active" : "Draft"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

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
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Notification */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error:</span> {formError}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-350">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Youth Retreat"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Event Type Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-350">
                    Event Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Event["type"])}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all cursor-pointer"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-350">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                    required
                  />
                </div>

                {/* Time Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-355">
                    Event Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 6:00 PM - 8:30 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>

                {/* Location Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-350">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Fellowship Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-355">
                  Description / Event Details
                </label>
                <textarea
                  placeholder="Details, schedules, speakers, or items to bring..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-850 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-0 outline-none transition-all min-h-[70px]"
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-355">
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
