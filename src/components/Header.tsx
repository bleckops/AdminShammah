"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { User, Bell, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Simple Breadcrumbs Title Mapping
  const getTitle = () => {
    switch (pathname) {
      case "/":
        return "Dashboard";
      case "/banners":
        return "Banners Management";
      case "/sermons":
        return "Sermons Management";
      case "/events":
        return "Events Management";
      default:
        return "Admin Panel";
    }
  };

  const getTodayDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-30 flex h-16 items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-8">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">
          {getTitle()}
        </h2>
      </div>

      {/* Right Side Accessories */}
      <div className="flex items-center gap-6">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
          <Calendar className="h-4 w-4 text-indigo-400" />
          <span>{getTodayDate()}</span>
        </div>

        {/* Action Notifications */}
        <button className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
        </button>

        <div className="h-6 w-px bg-slate-900"></div>

        {/* Profile Card Trigger */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-350 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                Admin
              </span>
              <span className="text-[10px] text-muted-text">Manager</span>
            </div>
          </button>

          {/* User Profile Action Dropdown */}
          {dropdownOpen && (
            <>
              {/* Click-away Overlay */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-2 z-50 animate-scaleUp">
                {user && (
                  <div className="px-3.5 py-2.5 border-b border-slate-850/60">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      Logged in as
                    </p>
                    <p className="text-xs font-semibold text-slate-300 truncate mt-0.5" title={user.email || ""}>
                      {user.email}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 hover:bg-red-500/5 hover:text-red-400 transition-all group/item text-left mt-1 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-slate-500 group-hover/item:text-red-400 transition-transform duration-200 group-hover/item:translate-x-0.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
