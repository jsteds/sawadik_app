"use server";

import { supabase } from "@/lib/supabase";

export async function getAllStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, code, location")
    .order("name", { ascending: true });

  if (error) {
    console.error("Gagal mengambil daftar store:", error.message);
    return [];
  }

  return data;
}
