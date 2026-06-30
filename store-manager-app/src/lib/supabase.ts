import { createClient } from "@supabase/supabase-js";
import type { MemberFormData, Profile, Store } from "./types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Auth Helpers ──────────────────────────────────────────────────────────────

/** Ambil profil lengkap user yang sedang login, beserta data tokonya. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, stores(*)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentProfile error:", error.message);
    return null;
  }

  // Jika profil tidak ditemukan, kembalikan null.
  // Profil akan dibuat otomatis oleh trigger `on_auth_user_created` di Supabase,
  // atau dapat dibuat manual via Supabase SQL: INSERT INTO public.profiles (id, email) VALUES (auth.uid(), auth.email()).
  return data as Profile | null;
}

// ─── Super Admin Helpers ───────────────────────────────────────────────────────

/** Ambil semua toko (untuk Super Admin store selector). */
export async function getAllStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name");

  if (error) {
    console.error("getAllStores error:", error.message);
    return [];
  }
  return (data as Store[]) ?? [];
}

// ─── Team CRUD Helpers ─────────────────────────────────────────────────────────

/** Ambil semua anggota tim di store yang sama dengan user login.
 *  RLS Supabase otomatis memfilter berdasarkan store_id.
 *  Super Admin bisa filter by storeId tertentu.
 */
export async function getTeamMembers(storeId?: string): Promise<Profile[]> {
  let query = supabase
    .from("profiles")
    .select("*, stores(*)")
    .order("created_at", { ascending: true });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTeamMembers error:", error.message);
    return [];
  }
  return (data as Profile[]) ?? [];
}

/** Tambah anggota tim baru.
 *  Karena tidak ada Supabase Auth invite di sini, kita buat record profil
 *  dengan invite_email yang akan dikirim terpisah, atau gunakan admin API.
 *  Untuk MVP: insert langsung ke profiles dengan store_id dari profil manager.
 */
export async function addTeamMember(
  storeId: string,
  formData: MemberFormData
): Promise<{ data: Profile | null; error: string | null }> {
  // Buat user auth dulu via admin? Tidak bisa dari browser.
  // MVP: Insert profil placeholder — user nanti melengkapi lewat invite email.
  // Untuk sekarang kita insert row dengan generated UUID dan data form.
  const newId = crypto.randomUUID();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: newId,
      email: formData.email,
      full_name: formData.full_name,
      nik: formData.nik,
      role: formData.role,
      position: formData.position,
      status: formData.status,
      store_id: storeId,
      join_date: formData.join_date,
      avatar_url: formData.avatar_url ?? null,
    })
    .select("*, stores(*)")
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile, error: null };
}

/** Update data anggota tim yang sudah ada. */
export async function updateTeamMember(
  memberId: string,
  formData: Partial<MemberFormData>
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.full_name,
      nik: formData.nik,
      position: formData.position,
      role: formData.role,
      status: formData.status,
      join_date: formData.join_date,
      avatar_url: formData.avatar_url,
    })
    .eq("id", memberId)
    .select("*, stores(*)")
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile, error: null };
}

/** Hapus anggota tim. RLS mencegah hapus diri sendiri atau anggota toko lain. */
export async function deleteTeamMember(
  memberId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

/** Upload avatar ke Supabase Storage dan kembalikan public URL-nya. */
export async function uploadAvatar(
  file: File,
  memberId: string
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop();
  const path = `avatars/${memberId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// ─── Store Settings Helpers ────────────────────────────────────────────────────

/** Update pengaturan toko (custom positions & visibility flags) */
export async function updateStoreSettings(
  storeId: string,
  settings: {
    custom_positions?: string[];
    team_visibility?: boolean;
    cleaning_visibility?: boolean;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("stores")
    .update(settings)
    .eq("id", storeId);

  return { error: error ? error.message : null };
}

// ─── General Cleaning Helpers ──────────────────────────────────────────────────

export async function getCleaningTasks(storeId?: string): Promise<any[]> {
  let query = supabase
    .from("general_cleaning")
    .select("*, assignee:profiles(*)")
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getCleaningTasks error:", error.message);
    return [];
  }
  return data || [];
}

export async function createCleaningTask(task: {
  area_equipment: string;
  location_type: string | null;
  assigned_to: string | null;
  store_id: string;
  date: string;
  reference_photo_url?: string | null;
  instructions?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("general_cleaning").insert(task);
  return { error: error ? error.message : null };
}

export async function uploadCleaningPhoto(
  taskId: string,
  stage: "before" | "progress" | "after",
  file: File,
  notes?: string
): Promise<{ url: string | null; error: string | null }> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-${stage}-${Date.now()}.${fileExt}`;
  const path = `tasks/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("cleaning_photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("cleaning_photos").getPublicUrl(path);
  const photoUrl = data.publicUrl;

  // Update task status and photo URL based on stage
  const updatePayload: Record<string, string> = {};
  if (stage === "before") {
    updatePayload.before_photo_url = photoUrl;
    updatePayload.status = "in_progress";
  } else if (stage === "progress") {
    updatePayload.progress_photo_url = photoUrl;
    updatePayload.status = "in_progress";
  } else if (stage === "after") {
    updatePayload.after_photo_url = photoUrl;
    updatePayload.status = "completed";
  }

  if (notes) {
    updatePayload.notes = notes;
  }

  const { error: updateError } = await supabase
    .from("general_cleaning")
    .update(updatePayload)
    .eq("id", taskId);

  if (updateError) {
    return { url: null, error: updateError.message };
  }

  return { url: photoUrl, error: null };
}

export async function takeoverCleaningTask(
  taskId: string,
  newUserId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("general_cleaning")
    .update({ assigned_to: newUserId })
    .eq("id", taskId);
  return { error: error ? error.message : null };
}

/** Upload foto cleaning ATAS NAMA staff tertentu (Super Admin feature).
 *  assigned_to TIDAK berubah — nama staff tetap.
 *  acted_by diisi dengan Super Admin ID.
 */
export async function uploadCleaningPhotoOnBehalf(
  taskId: string,
  stage: "before" | "progress" | "after",
  file: File,
  superAdminId: string,
  notes?: string
): Promise<{ url: string | null; error: string | null }> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-${stage}-${Date.now()}.${fileExt}`;
  const path = `tasks/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("cleaning_photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("cleaning_photos").getPublicUrl(path);
  const photoUrl = data.publicUrl;

  const updatePayload: Record<string, string> = { acted_by: superAdminId };
  if (stage === "before") {
    updatePayload.before_photo_url = photoUrl;
    updatePayload.status = "in_progress";
  } else if (stage === "progress") {
    updatePayload.progress_photo_url = photoUrl;
    updatePayload.status = "in_progress";
  } else if (stage === "after") {
    updatePayload.after_photo_url = photoUrl;
    updatePayload.status = "completed";
  }

  if (notes) {
    updatePayload.notes = notes;
  }

  const { error: updateError } = await supabase
    .from("general_cleaning")
    .update(updatePayload)
    .eq("id", taskId);

  if (updateError) {
    return { url: null, error: updateError.message };
  }

  return { url: photoUrl, error: null };
}

export async function updateCleaningTask(
  taskId: string,
  payload: {
    area_equipment: string;
    assigned_to: string | null;
    instructions: string | null;
    date: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("general_cleaning")
    .update(payload)
    .eq("id", taskId);
  return { error: error ? error.message : null };
}

export async function deleteCleaningTask(
  taskId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("general_cleaning")
    .delete()
    .eq("id", taskId);
  return { error: error ? error.message : null };
}

export async function bulkCreateCleaningTasks(tasks: {
  area_equipment: string;
  location_type: string | null;
  assigned_to: string | null;
  store_id: string;
  date: string;
  reference_photo_url?: string | null;
  instructions?: string | null;
}[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from("general_cleaning").insert(tasks);
  return { error: error ? error.message : null };
}

/** Upload foto referensi area/equipment ke Supabase Storage. */
export async function uploadReferencePhoto(
  file: File,
  storeId: string
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop();
  const fileName = `ref-${storeId}-${Date.now()}.${ext}`;
  const path = `references/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("cleaning_photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("cleaning_photos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// ─── Daily Cleaning Helpers ────────────────────────────────────────────────────

export async function getDailyCleaningTasks(date: string, storeId?: string): Promise<any[]> {
  let query = supabase
    .from("daily_cleaning")
    .select("*, completer:profiles!completed_by(*), assignee:profiles!assigned_to(*), store:stores(name)")
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDailyCleaningTasks error:", error.message);
    return [];
  }
  return data || [];
}

export async function bulkCreateDailyCleaningTasks(tasks: {
  store_id: string;
  date: string;
  shift?: string;
  task_name: string;
  assigned_to: string;
}[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from("daily_cleaning").insert(tasks);
  return { error: error ? error.message : null };
}

export async function completeDailyCleaningTask(
  taskId: string,
  userId: string,
  photoFile?: File | null
): Promise<{ error: string | null }> {
  let photoUrl: string | null = null;

  if (photoFile) {
    const ext = photoFile.name.split(".").pop();
    const fileName = `daily-${taskId}-${Date.now()}.${ext}`;
    const path = `daily/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("cleaning_photos")
      .upload(path, photoFile, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message };
    }
    const { data } = supabase.storage.from("cleaning_photos").getPublicUrl(path);
    photoUrl = data.publicUrl;
  }

  const payload: any = {
    status: "completed",
    completed_by: userId,
    completed_at: new Date().toISOString(),
  };

  if (photoUrl) {
    payload.photo_url = photoUrl;
  }

  const { error } = await supabase
    .from("daily_cleaning")
    .update(payload)
    .eq("id", taskId);

  return { error: error ? error.message : null };
}

/** Selesaikan tugas daily cleaning ATAS NAMA staff (Super Admin feature).
 *  completed_by tetap staff yang ditugaskan, acted_by = Super Admin ID.
 */
export async function completeDailyCleaningTaskOnBehalf(
  taskId: string,
  staffUserId: string,
  superAdminId: string,
  photoFile?: File | null
): Promise<{ error: string | null }> {
  let photoUrl: string | null = null;

  if (photoFile) {
    const ext = photoFile.name.split(".").pop();
    const fileName = `daily-${taskId}-${Date.now()}.${ext}`;
    const path = `daily/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("cleaning_photos")
      .upload(path, photoFile, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message };
    }
    const { data } = supabase.storage.from("cleaning_photos").getPublicUrl(path);
    photoUrl = data.publicUrl;
  }

  const payload: Record<string, unknown> = {
    status: "completed",
    completed_by: staffUserId,
    completed_at: new Date().toISOString(),
    acted_by: superAdminId,
  };

  if (photoUrl) {
    payload.photo_url = photoUrl;
  }

  const { error } = await supabase
    .from("daily_cleaning")
    .update(payload)
    .eq("id", taskId);

  return { error: error ? error.message : null };
}

export async function uncompleteDailyCleaningTask(
  taskId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("daily_cleaning")
    .update({
      status: "pending",
      completed_by: null,
      completed_at: null,
      photo_url: null,
      acted_by: null,
    })
    .eq("id", taskId);
  return { error: error ? error.message : null };
}

export async function deleteDailyCleaningTask(
  taskId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("daily_cleaning").delete().eq("id", taskId);
  return { error: error ? error.message : null };
}

// ─── Documents (SOP / WI) Helpers ─────────────────────────────────────────────

export async function getDocuments(storeFilter?: string): Promise<any[]> {
  let query = supabase
    .from("documents")
    .select("*, uploader:profiles(full_name), store:stores(name)")
    .order("created_at", { ascending: false });

  if (storeFilter) {
    query = query.eq("store_id", storeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getDocuments error:", error.message);
    return [];
  }
  return data || [];
}

export async function uploadDocument(
  file: File,
  title: string,
  category: string,
  storeId: string,
  uploadedBy: string,
  isPublic: boolean = false
): Promise<{ error: string | null }> {
  const ext = file.name.split(".").pop();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${storeId}/${Date.now()}_${safeName}`;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

  const { error: dbError } = await supabase.from("documents").insert({
    title,
    category,
    file_url: urlData.publicUrl,
    file_path: path,
    file_size: file.size,
    store_id: storeId,
    uploaded_by: uploadedBy,
    is_public: isPublic,
  });

  if (dbError) {
    // Rollback storage upload
    await supabase.storage.from("documents").remove([path]);
    return { error: dbError.message };
  }

  return { error: null };
}

export async function deleteDocument(
  docId: string,
  filePath: string | null
): Promise<{ error: string | null }> {
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", docId);

  if (dbError) return { error: dbError.message };

  if (filePath) {
    await supabase.storage.from("documents").remove([filePath]);
  }

  return { error: null };
}

export async function uploadGCPdfToPublic(
  pdfBlob: Blob,
  title: string,
  storeId: string,
  uploadedBy: string
): Promise<{ error: string | null }> {
  const safeName = title.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${storeId}/GC_Reports/${Date.now()}_${safeName}.pdf`;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(path, pdfBlob, { upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

  const { error: dbError } = await supabase.from("documents").insert({
    title,
    category: "gc_report",
    file_url: urlData.publicUrl,
    file_path: path,
    file_size: pdfBlob.size,
    store_id: storeId,
    uploaded_by: uploadedBy,
    is_public: true,
  });

  if (dbError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: dbError.message };
  }

  return { error: null };
}
