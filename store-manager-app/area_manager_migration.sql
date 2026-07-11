-- ═══════════════════════════════════════════════════════════════════════════════
-- Area Manager Migration
-- Jalankan SQL ini di Supabase SQL Editor untuk mengaktifkan role 'area_manager'
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Update CHECK constraint pada profiles.role — tambah 'area_manager'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'super_admin', 'area_manager'));

-- 2. Helper: check apakah user saat ini adalah area_manager
CREATE OR REPLACE FUNCTION public.is_area_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'area_manager'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Update RLS Policies agar Area Manager bisa membaca data semua toko
--    (khusus untuk pemantauan: stores, profiles, general_cleaning, daily_cleaning, schedules)

-- ── STORES ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stores_select_associated" ON public.stores;
CREATE POLICY "stores_select_associated" ON public.stores FOR SELECT USING (
  public.is_super_admin()
  OR public.is_area_manager()
  OR id = public.get_auth_store_id()
  OR (public.get_auth_store_id() IS NULL)
);

-- ── PROFILES ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_visibility" ON public.profiles;
CREATE POLICY "profiles_select_visibility"
  ON public.profiles FOR SELECT
  USING (
    public.is_super_admin()
    OR public.is_area_manager()
    OR store_id = public.get_auth_store_id()
    OR auth_user_id = auth.uid()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );

-- ── GENERAL CLEANING ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cleaning_select_visibility" ON public.general_cleaning;
CREATE POLICY "cleaning_select_visibility"
  ON public.general_cleaning FOR SELECT
  USING (
    public.is_super_admin()
    OR public.is_area_manager()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

-- ── DAILY CLEANING ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "daily_cleaning_select" ON public.daily_cleaning;
CREATE POLICY "daily_cleaning_select"
  ON public.daily_cleaning FOR SELECT
  USING (
    public.is_super_admin()
    OR public.is_area_manager()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

-- ── SCHEDULES ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "schedules_select_visibility" ON public.schedules;
CREATE POLICY "schedules_select_visibility"
  ON public.schedules FOR SELECT
  USING (
    public.is_super_admin()
    OR public.is_area_manager()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );
