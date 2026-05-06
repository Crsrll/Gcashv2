"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically import supabase only on client to avoid SSR issues
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const u = data.session.user;
          setUser({
            id: u.id,
            phone: u.email?.replace("@gcash.local", ""),
            name: u.user_metadata?.display_name || "User",
            user_metadata: u.user_metadata,
          });
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const u = session.user;
          setUser({
            id: u.id,
            phone: u.email?.replace("@gcash.local", ""),
            name: u.user_metadata?.display_name || "User",
            user_metadata: u.user_metadata,
          });
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    });
  }, []);

  const login = (userData) => setUser(userData);

  const logout = async () => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
