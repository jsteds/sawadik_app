// src/lib/types.ts
// Shared TypeScript types untuk Store Manager App

export interface Store {
  id: string;
  name: string;
  code: string | null;
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
  role: "super_admin" | "area_manager" | "admin" | "manager" | "staff";
  position: string | null;       // jabatan: "Kasir Senior", "Staff Gudang", dll
  status: "aktif" | "cuti" | "resign";
  store_id: string | null;
  join_date: string | null;
  avatar_url: string | null;
  contract_end_date: string | null;
  incharge_start_date: string | null;
  managed_store_ids: string[] | null; // Area Manager: store IDs in scope
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
  role: "super_admin" | "area_manager" | "manager" | "staff";
  status: "aktif" | "cuti" | "resign";
  join_date: string;
  avatar_url?: string;
};

export const POSITION_OPTIONS = [
  "Area Manager",
  "Store Manager",
  "Asst. Store Manager",
  "Chatime Staff",
  "Partimer",
] as const;

export const ROLE_LABELS: Record<Profile["role"], string> = {
  super_admin: "Super Admin",
  area_manager: "Area Manager",
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
  reference_photo_url: string | null; // foto referensi area/equipment yang diunggah manager
  notes: string | null; // catatan dari staff saat upload foto
  instructions?: string | null; // instruksi tambahan dari manager
  acted_by?: string | null; // ID super admin yang mengerjakan atas nama staff
  date: string;
  created_at: string;
  // joined from profiles table (optional)
  assignee?: Profile | null;
  actor?: { full_name: string | null } | null; // super admin yang mengerjakan
}

export const LOCATION_TYPES = [
  "Area",
  "Equipment",
  "Mesin",
  "Lainnya",
] as const;

export type LocationType = typeof LOCATION_TYPES[number];

// ─── Daily Cleaning ───────────────────────────────────────────────────────────

export interface DailyCleaningTask {
  id: string;
  store_id: string;
  date: string;
  shift: string;
  task_name: string;
  status: "pending" | "completed";
  assigned_to?: string;
  completed_by?: string;
  completed_at?: string;
  photo_url?: string;
  acted_by?: string | null; // ID super admin yang mengerjakan atas nama staff
  created_at: string;

  // joined data
  assignee?: { full_name: string; avatar_url: string };
  completer?: { full_name: string; avatar_url: string };
  actor?: { full_name: string | null } | null;
  store?: { name: string };
}

export const SHIFT_OPTIONS = ["Opening", "Mid", "Closing", "Lainnya"] as const;

// ─── Documents ────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  title: string;
  category: "sop" | "wi" | "policy" | "other";
  file_url: string;
  file_path: string | null; // storage path for deletion
  file_size: number | null; // bytes
  store_id: string;
  uploaded_by: string | null;
  is_public: boolean;
  created_at: string;
  // joined
  uploader?: { full_name: string | null } | null;
  store?: { name: string; code?: string } | null;
}

export const DOCUMENT_CATEGORIES = [
  { value: "sop", label: "SOP" },
  { value: "wi", label: "WI" },
  { value: "policy", label: "Policy" },
  { value: "gc_report", label: "Laporan GC" },
  { value: "other", label: "Lainnya" },
] as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]["value"];

// ─── Schedule Reviewer ──────────────────────────────────────────────────────────

export interface ShiftCode {
  id: string;
  code: string;
  group_name: string | null;
  time_in: string | null;
  time_out: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  store_id: string;
  profile_id: string;
  date: string;
  shift_code_id: string | null;
  created_at: string;
  // joined fields
  shift_code?: ShiftCode | null;
  profile?: Profile | null;
}

// ─── Google Maps Reviews ────────────────────────────────────────────────────────

export interface StoreGoogleMaps {
  id: string;
  store_id: string;
  google_maps_url: string;
  place_id: string | null;
  place_name: string | null;
  last_scraped_at: string | null;
  created_at: string;
}

export interface GoogleMapsReview {
  id: string;
  store_id: string;
  reviewer_name: string | null;
  review_text: string | null;
  rating: number;
  review_date: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  sentiment_score: number | null;
  scraped_at: string;
  google_review_id: string | null;
}

export interface ReviewSentimentSummary {
  id: string;
  store_id: string;
  period_start: string;
  period_end: string;
  total_reviews: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  average_rating: number | null;
  created_at: string;
}

export type SentimentType = "positive" | "negative" | "neutral";

export const SENTIMENT_LABELS: Record<SentimentType, string> = {
  positive: "Positif",
  negative: "Negatif",
  neutral: "Netral",
};

export const SENTIMENT_COLORS: Record<SentimentType, string> = {
  positive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  negative: "bg-red-500/20 text-red-400 border-red-500/30",
  neutral: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};
