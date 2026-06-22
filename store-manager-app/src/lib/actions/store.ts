"use server";

import { supabase } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";

export async function getAllStores() {
  noStore();
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
