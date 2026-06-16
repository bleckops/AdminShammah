"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64 pt-16 min-h-screen flex flex-col">
        {/* Header Bar */}
        <Header />

        {/* Dynamic Inner Page */}
        <main className="flex-1 p-8 overflow-y-auto relative">
          {/* Subtle Dynamic Glowing Background Accents */}
          <div 
            className="glow-bg bg-indigo-500" 
            style={{ right: "-50px", top: "-50px" }} 
          />
          <div 
            className="glow-bg bg-pink-500" 
            style={{ left: "-50px", bottom: "-50px", opacity: 0.08 }} 
          />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
