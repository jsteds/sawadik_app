"use server";

import { supabase } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";

export async function getAllStores() {
  noStore();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, code")
    .order("name", { ascending: true });

  if (error) {
    console.error("Gagal mengambil daftar store:", error.message);
    return [];
  }

  return data;
}

export async function ensureStoreExists(name: string, code: string) {
  // Check if store exists by code
  let { data: store, error } = await supabase
    .from("stores")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (store) return store.id;

  // Insert if not exists
  const { data: newStore, error: insertError } = await supabase
    .from("stores")
    .insert({ name, code })
    .select("id")
    .single();
    
  if (insertError) {
    console.error("Gagal menambahkan store baru:", insertError.message);
    throw new Error(insertError.message);
  }
  return newStore.id;
}
