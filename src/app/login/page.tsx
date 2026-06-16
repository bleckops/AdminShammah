"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Crosshair,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Listen to admin role verification lockouts from AuthContext
  useEffect(() => {
    const handleAuthError = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setError(customEvent.detail);
        setLoading(false);
      }
    };
    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will automatically handle the redirection to dashboard
    } catch (err: any) {
      console.error("Login failed:", err);
      // Make errors highly readable
      switch (err.code) {
        case "auth/invalid-email":
          setError("The email address is badly formatted.");
          break;
        case "auth/user-disabled":
          setError("This administrator account has been disabled.");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email address or password.");
          break;
        default:
          setError("An authentication error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Glowing Gradients */}
      <div 
        className="glow-bg bg-indigo-600" 
        style={{ top: "10%", left: "10%", width: "450px", height: "450px", opacity: 0.12 }} 
      />
      <div 
        className="glow-bg bg-pink-500" 
        style={{ bottom: "10%", right: "10%", width: "450px", height: "450px", opacity: 0.08 }} 
      />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md glass-panel glass-panel-glow-indigo rounded-3xl p-8 relative z-10 border border-slate-800 bg-slate-900/40">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/5">
            <Crosshair className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-text mt-1">
            Sign in to manage banners and sermons
          </p>
        </div>

        {/* Action Error Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authentication Failed:</span> {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                placeholder="admin@shammah.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 py-3.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 pl-11 pr-11 py-3.5 text-xs text-slate-100 placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-slate-100 py-3.5 text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer Support Message */}
        <div className="text-center mt-8 pt-6 border-t border-slate-900/60">
          <p className="text-[11px] text-slate-500">
            For security, please sign in with authorized admin credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
