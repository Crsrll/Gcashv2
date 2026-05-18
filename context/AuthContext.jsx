"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session - THIS IS CRITICAL
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setLoading(false);
          return;
        }

        if (session) {
          const u = session.user;
          setUser({
            id: u.id,
            phone: u.email?.replace("@gcash.local", ""),
            name:
              u.user_metadata?.display_name || u.user_metadata?.name || "User",
            email: u.email,
            user_metadata: u.user_metadata,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to get session:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const u = session.user;
        setUser({
          id: u.id,
          phone: u.email?.replace("@gcash.local", ""),
          name:
            u.user_metadata?.display_name || u.user_metadata?.name || "User",
          email: u.email,
          user_metadata: u.user_metadata,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
