-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix Check Constraint pada profiles.role
-- Jalankan SQL ini di Supabase SQL Editor jika mengalami error constraint
-- "new row for relation "profiles" violates check constraint "profiles_role_check""
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'store_manager', 'staff', 'super_admin', 'area_manager'));
