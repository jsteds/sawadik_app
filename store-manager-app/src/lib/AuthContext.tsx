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
  // Super Admin & Area Manager features
  isSuperAdmin: boolean;
  isAreaManager: boolean;
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
  isAreaManager: false,
  activeStoreId: null,
  setActiveStore: () => {},
  allStores: [],
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Super Admin & Area Manager state
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === "super_admin";
  const isAreaManager = profile?.role === "area_manager";

  const refreshProfile = useCallback(async () => {
    let p = await getCurrentProfile();
    
    // Retry logic for Supabase trigger delay
    if (!p) {
      for (let i = 0; i < 3; i++) {
        await new Promise(res => setTimeout(res, 1000));
        p = await getCurrentProfile();
        if (p) break;
      }
    }
    
    setProfile(p);

    // If super admin, fetch all stores
    if (p?.role === "super_admin") {
      const { data: stores } = await supabase
        .from("stores")
        .select("*")
        .order("name");
      if (stores && stores.length > 0) {
        setAllStores(stores as Store[]);
        setActiveStoreId((prev) => prev ?? stores[0].id);
      }
    } else if (p?.role === "area_manager") {
      // Fetch only stores in managed_store_ids scope (if set), otherwise all stores
      let query = supabase.from("stores").select("*").order("name");
      if (p.managed_store_ids && p.managed_store_ids.length > 0) {
        query = query.in("id", p.managed_store_ids);
      }
      const { data: stores } = await query;
      if (stores && stores.length > 0) {
        setAllStores(stores as Store[]);
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
        isAreaManager,
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
