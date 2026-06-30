-- ═══════════════════════════════════════════════════════════════════════════════
-- Super Admin Migration
-- Jalankan SQL ini di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Update CHECK constraint pada profiles.role — tambah 'super_admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'super_admin'));

-- 2. Tambah kolom acted_by ke general_cleaning — audit trail Super Admin
ALTER TABLE public.general_cleaning
  ADD COLUMN IF NOT EXISTS acted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Tambah kolom acted_by ke daily_cleaning — audit trail Super Admin
ALTER TABLE public.daily_cleaning
  ADD COLUMN IF NOT EXISTS acted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Update helper function get_auth_role() (sudah ada, kita update)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 5. Helper: check apakah user saat ini adalah super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (auth_user_id = auth.uid() OR id = auth.uid())
      AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Update RLS Policies — Super Admin bypass store_id filter
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STORES ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stores_select_associated" ON public.stores;
CREATE POLICY "stores_select_associated" ON public.stores FOR SELECT USING (
  public.is_super_admin()
  OR id = public.get_auth_store_id()
  OR (public.get_auth_store_id() IS NULL)
);

DROP POLICY IF EXISTS "stores_update_manager" ON public.stores;
CREATE POLICY "stores_update_manager" ON public.stores FOR UPDATE USING (
  public.is_super_admin()
  OR (
    id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  )
);

-- ── PROFILES ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_visibility" ON public.profiles;
CREATE POLICY "profiles_select_visibility"
  ON public.profiles FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
    OR auth_user_id = auth.uid()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );

DROP POLICY IF EXISTS "profiles_insert_manager" ON public.profiles;
CREATE POLICY "profiles_insert_manager"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "profiles_update_manager" ON public.profiles;
CREATE POLICY "profiles_update_manager"
  ON public.profiles FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "profiles_delete_manager" ON public.profiles;
CREATE POLICY "profiles_delete_manager"
  ON public.profiles FOR DELETE
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
      AND id != auth.uid()
    )
  );

-- ── GENERAL CLEANING ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cleaning_select_visibility" ON public.general_cleaning;
CREATE POLICY "cleaning_select_visibility"
  ON public.general_cleaning FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

DROP POLICY IF EXISTS "cleaning_insert_same_store" ON public.general_cleaning;
CREATE POLICY "cleaning_insert_same_store"
  ON public.general_cleaning FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

DROP POLICY IF EXISTS "cleaning_update_same_store" ON public.general_cleaning;
CREATE POLICY "cleaning_update_same_store"
  ON public.general_cleaning FOR UPDATE
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

DROP POLICY IF EXISTS "cleaning_delete_same_store" ON public.general_cleaning;
CREATE POLICY "cleaning_delete_same_store"
  ON public.general_cleaning FOR DELETE
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

-- ── DAILY CLEANING ──────────────────────────────────────────────────────────────
-- (Policies mungkin belum ada jika tabel baru, tapi kita drop-if-exists untuk safety)
DROP POLICY IF EXISTS "daily_cleaning_select" ON public.daily_cleaning;
CREATE POLICY "daily_cleaning_select"
  ON public.daily_cleaning FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

DROP POLICY IF EXISTS "daily_cleaning_insert" ON public.daily_cleaning;
CREATE POLICY "daily_cleaning_insert"
  ON public.daily_cleaning FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

DROP POLICY IF EXISTS "daily_cleaning_update" ON public.daily_cleaning;
CREATE POLICY "daily_cleaning_update"
  ON public.daily_cleaning FOR UPDATE
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

DROP POLICY IF EXISTS "daily_cleaning_delete" ON public.daily_cleaning;
CREATE POLICY "daily_cleaning_delete"
  ON public.daily_cleaning FOR DELETE
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

-- ── DOCUMENTS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documents_same_store" ON public.documents;
CREATE POLICY "documents_same_store"
  ON public.documents FOR ALL
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
  );

-- ── SCHEDULES ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "schedules_select_visibility" ON public.schedules;
CREATE POLICY "schedules_select_visibility"
  ON public.schedules FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );

DROP POLICY IF EXISTS "schedules_insert_manager" ON public.schedules;
CREATE POLICY "schedules_insert_manager"
  ON public.schedules FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "schedules_update_manager" ON public.schedules;
CREATE POLICY "schedules_update_manager"
  ON public.schedules FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "schedules_delete_manager" ON public.schedules;
CREATE POLICY "schedules_delete_manager"
  ON public.schedules FOR DELETE
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_auth_store_id()
      AND public.get_auth_role() IN ('admin', 'manager')
    )
  );

-- ── SHIFT CODES ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "shift_codes_all_manager" ON public.shift_codes;
CREATE POLICY "shift_codes_all_manager"
  ON public.shift_codes FOR ALL
  USING (public.is_super_admin() OR public.get_auth_role() IN ('admin', 'manager'));
