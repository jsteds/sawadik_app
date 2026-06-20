// src/lib/types.ts
// Shared TypeScript types untuk Store Manager App

export interface Store {
  id: string;
  name: string;
  location: string | null;
  custom_positions: string[] | null;
  team_visibility: boolean;
  cleaning_visibility: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  nik: string | null;
  role: "admin" | "manager" | "staff";
  position: string | null;       // jabatan: "Kasir Senior", "Staff Gudang", dll
  status: "aktif" | "cuti" | "resign";
  store_id: string | null;
  join_date: string | null;
  avatar_url: string | null;
  created_at: string;
  // joined from stores table (optional)
  stores?: Store | null;
}

export interface TeamMember extends Profile {
  stores?: Store | null;
}

export type MemberFormData = {
  full_name: string;
  nik: string;
  email: string;
  position: string;
  role: "manager" | "staff";
  status: "aktif" | "cuti" | "resign";
  join_date: string;
  avatar_url?: string;
};

// Jabatan/posisi yang tersedia di toko
export const POSITION_OPTIONS = [
  "Store Manager",
  "Supervisor",
  "Kasir Senior",
  "Kasir",
  "Staff Penjualan",
  "Staff Gudang",
  "Staff Cleaning",
  "Security",
  "Lainnya",
] as const;

export const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export const STATUS_LABELS: Record<Profile["status"], string> = {
  aktif: "Aktif",
  cuti: "Cuti",
  resign: "Resign",
};

export const STATUS_COLORS: Record<Profile["status"], string> = {
  aktif: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cuti: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  resign: "bg-red-500/20 text-red-300 border-red-500/30",
};

export interface GeneralCleaningTask {
  id: string;
  area_equipment: string;
  location_type: string | null; // "Area" | "Equipment" | "Mesin" | "Lainnya"
  status: "pending" | "in_progress" | "completed" | "verified";
  assigned_to: string | null;
  store_id: string;
  before_photo_url: string | null;
  progress_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null; // catatan dari staff saat upload foto
  date: string;
  created_at: string;
  // joined from profiles table (optional)
  assignee?: Profile | null;
}

export const LOCATION_TYPES = [
  "Area",
  "Equipment",
  "Mesin",
  "Lainnya",
] as const;

export type LocationType = typeof LOCATION_TYPES[number];
