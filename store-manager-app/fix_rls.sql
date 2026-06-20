-- Fix RLS and Function script
-- Copy and paste all of this into the Supabase SQL Editor and click RUN

-- 1. Fix the helper functions to be safer (using LIMIT 1)
CREATE OR REPLACE FUNCTION public.get_auth_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM public.profiles 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles 
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "profiles_select_visibility" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- 3. Recreate Profiles Policies
CREATE POLICY "profiles_select_visibility"
  ON public.profiles FOR SELECT
  USING (
    store_id = public.get_auth_store_id()
    OR auth_user_id = auth.uid()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );

CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "profiles_insert_manager"
  ON public.profiles FOR INSERT
  WITH CHECK (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

CREATE POLICY "profiles_update_manager"
  ON public.profiles FOR UPDATE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

CREATE POLICY "profiles_delete_manager"
  ON public.profiles FOR DELETE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
    AND id != auth.uid()
  );

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

-- 4. Recreate Documents Policies
DROP POLICY IF EXISTS "documents_same_store" ON public.documents;

CREATE POLICY "documents_same_store"
  ON public.documents FOR ALL
  USING (
    store_id = public.get_auth_store_id()
  );

-- 5. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
