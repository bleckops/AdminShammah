"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  FileVideo,
  LogOut,
  Crosshair,
  Calendar,
  Library,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Banners", href: "/banners", icon: ImageIcon },
    { name: "Sermons", href: "/sermons", icon: FileVideo },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Resources", href: "/resources", icon: Library },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Crosshair className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-100">
            Shammah Admin
          </h1>
          <p className="text-xs text-muted-text">Control Panel</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? "text-slate-100" : "text-slate-400 group-hover:text-indigo-400"
              }`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Admin Info & Log Out */}
      <div className="mt-auto border-t border-slate-900 pt-4 px-2 space-y-4">
        {user && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-text">Signed in as</span>
            <span className="text-xs font-semibold text-slate-200 truncate" title={user.email || ""}>
              {user.email}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 rounded-xl border border-slate-900 hover:border-red-500/20 px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/5 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-400 transition-transform duration-200 group-hover:translate-x-0.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
