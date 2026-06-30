"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, getCurrentProfile } from "./supabase";
import type { Profile, Store } from "./types";

// ─── Context Shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Super Admin features
  isSuperAdmin: boolean;
  activeStoreId: string | null;
  setActiveStore: (storeId: string | null) => void;
  allStores: Store[];
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  isSuperAdmin: false,
  activeStoreId: null,
  setActiveStore: () => {},
  allStores: [],
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Super Admin state
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === "super_admin";

  const refreshProfile = useCallback(async () => {
    const p = await getCurrentProfile();
    setProfile(p);

    // If super admin, fetch all stores
    if (p?.role === "super_admin") {
      const { data: stores } = await supabase
        .from("stores")
        .select("*")
        .order("name");
      if (stores && stores.length > 0) {
        setAllStores(stores as Store[]);
        // Auto-select first store if none selected yet
        setActiveStoreId((prev) => prev ?? stores[0].id);
      }
    } else if (p?.store_id) {
      setActiveStoreId(p.store_id);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        refreshProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        refreshProfile();
      } else {
        setProfile(null);
        setAllStores([]);
        setActiveStoreId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setAllStores([]);
    setActiveStoreId(null);
  };

  const setActiveStore = useCallback((storeId: string | null) => {
    setActiveStoreId(storeId);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
        isSuperAdmin,
        activeStoreId,
        setActiveStore,
        allStores,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
