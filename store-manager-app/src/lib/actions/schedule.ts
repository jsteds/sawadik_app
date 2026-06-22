"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Mendapatkan semua Shift Codes yang tersedia (global)
 */
export async function getShiftCodes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_codes")
    .select("*")
    .order("code", { ascending: true });

  if (error) {
    console.error("Error fetching shift codes:", error.message);
    throw new Error("Gagal mengambil data kode shift");
  }

  return data;
}

/**
 * Menyimpan atau memperbarui daftar shift codes
 */
export async function upsertShiftCode(shiftData: { code: string; time_in?: string; time_out?: string; group_name?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_codes")
    .upsert({
      code: shiftData.code,
      time_in: shiftData.time_in || null,
      time_out: shiftData.time_out || null,
      group_name: shiftData.group_name || null,
    }, { onConflict: 'code' })
    .select()
    .single();

  if (error) {
    console.error("Error upserting shift code:", error.message);
    throw new Error("Gagal menyimpan kode shift");
  }

  revalidatePath("/dashboard/schedule/manager");
  return data;
}

/**
 * Menghapus kode shift
 */
export async function deleteShiftCode(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shift_codes").delete().eq("id", id);
  if (error) throw new Error("Gagal menghapus kode shift");
  revalidatePath("/dashboard/schedule/manager");
}

/**
 * Mengambil jadwal karyawan dalam satu toko untuk bulan tertentu
 * @param storeId ID Toko
 * @param startDate Tanggal awal (YYYY-MM-DD)
 * @param endDate Tanggal akhir (YYYY-MM-DD)
 */
export async function getSchedules(storeId: string, startDate: string, endDate: string) {
  const supabase = await createClient();
  
  // 1. Ambil data profiles di toko tersebut
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "aktif");

  if (profilesError) throw new Error("Gagal mengambil data karyawan");

  // 2. Ambil data jadwal di rentang waktu tersebut
  const { data: schedules, error: schedulesError } = await supabase
    .from("schedules")
    .select(`
      *,
      shift_code:shift_codes (*)
    `)
    .eq("store_id", storeId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (schedulesError) throw new Error("Gagal mengambil data jadwal");

  return { profiles, schedules };
}

/**
 * Menyimpan banyak jadwal sekaligus (untuk fitur grid manager)
 */
export async function upsertSchedules(
  storeId: string,
  schedulesToUpsert: { profile_id: string; date: string; shift_code_id: string | null }[]
) {
  const supabase = await createClient();
  
  // Pisahkan mana yang insert/update (punya shift_code_id) dan mana yang delete (shift_code_id === null)
  const toUpsert = schedulesToUpsert
    .filter(s => s.shift_code_id !== null)
    .map(s => ({
      store_id: storeId,
      profile_id: s.profile_id,
      date: s.date,
      shift_code_id: s.shift_code_id,
    }));

  const toDelete = schedulesToUpsert.filter(s => s.shift_code_id === null);

  // Lakukan operasi UPSERT
  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("schedules")
      .upsert(toUpsert, { onConflict: "profile_id,date" });
    
    if (error) {
      console.error("Upsert schedules error:", error.message);
      throw new Error("Gagal menyimpan jadwal");
    }
  }

  // Lakukan operasi DELETE untuk shift yang dihilangkan
  for (const del of toDelete) {
    await supabase
      .from("schedules")
      .delete()
      .eq("profile_id", del.profile_id)
      .eq("date", del.date);
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/schedule/manager");
}
