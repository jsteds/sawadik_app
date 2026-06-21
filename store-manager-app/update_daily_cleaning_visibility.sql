-- Update RLS Policy for daily_cleaning to support cross-branch visibility

-- 1. Hapus policy lama yang ketat (hanya melihat cabang sendiri)
DROP POLICY IF EXISTS "daily_cleaning_same_store" ON public.daily_cleaning;
DROP POLICY IF EXISTS "daily_cleaning_select" ON public.daily_cleaning;
DROP POLICY IF EXISTS "daily_cleaning_insert" ON public.daily_cleaning;
DROP POLICY IF EXISTS "daily_cleaning_update" ON public.daily_cleaning;
DROP POLICY IF EXISTS "daily_cleaning_delete" ON public.daily_cleaning;

-- 2. Buat policy SELECT baru yang memperbolehkan melihat tugas cabang lain JIKA cabang tersebut mengaktifkan cleaning_visibility
CREATE POLICY "daily_cleaning_select"
  ON public.daily_cleaning FOR SELECT
  USING (
    store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

-- 3. Policy INSERT, UPDATE, DELETE tetap dibatasi HANYA untuk cabang sendiri
CREATE POLICY "daily_cleaning_insert"
  ON public.daily_cleaning FOR INSERT
  WITH CHECK (store_id = public.get_auth_store_id());

CREATE POLICY "daily_cleaning_update"
  ON public.daily_cleaning FOR UPDATE
  USING (store_id = public.get_auth_store_id());

CREATE POLICY "daily_cleaning_delete"
  ON public.daily_cleaning FOR DELETE
  USING (store_id = public.get_auth_store_id());

-- 4. Reload schema cache postgrest untuk memastikan perubahan langsung aktif
NOTIFY pgrst, 'reload schema';
