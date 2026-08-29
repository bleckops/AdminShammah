"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (cancelled) return;

      setLoading(true);

      if (currentUser) {
        try {
          // Check Firestore admins collection for role authority
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          
          const adminDocRef = doc(db, "admins", currentUser.uid);
          const adminDocSnap = await getDoc(adminDocRef);

          const data = adminDocSnap.exists() ? adminDocSnap.data() : null;
          const isDbAdmin = data && (data.isAdmin === true || data.role === "admin");

          if (isDbAdmin && !cancelled) {
            setUser(currentUser);
          } else {
            // Reject non-admin user
            await firebaseSignOut(auth);
            if (cancelled) return;
            setUser(null);
            
            // Dispatch dynamic error to show in Login Screen
            const errorMsg = `Access Denied. Your account is not configured in the 'admins' collection. Please add a document in Firestore under 'admins/${currentUser.uid}' with { "isAdmin": true } to authorize.`;
            window.dispatchEvent(new CustomEvent("auth-error", { detail: errorMsg }));
          }
        } catch (error) {
          console.error("Admin verification error:", error);
          if (cancelled) return;
          await firebaseSignOut(auth);
          if (cancelled) return;
          setUser(null);
          
          // Dispatch rules error
          const errorMsg = "Permission Denied: Unable to read 'admins' collection. Verify Firestore is initialized and your security rules allow authenticated users to read.";
          window.dispatchEvent(new CustomEvent("auth-error", { detail: errorMsg }));
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Protect routes without re-subscribing to Firebase whenever navigation changes.
  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === "/login";
    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [loading, pathname, router, user]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const isLoginPage = pathname === "/login";
  const shouldShowLoading = loading || (!user && !isLoginPage);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {shouldShowLoading ? (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
          {/* Circular Loading Animation */}
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-lg font-medium tracking-wide animate-pulse">
            Verifying Admin Session...
          </h2>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
