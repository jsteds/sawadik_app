-- Supabase Database Schema for Store Management App
-- v2.3: Fix RLS recursion, add idempotent DROP POLICY, enable RLS for stores, and setup tables & storage buckets

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    custom_positions JSONB DEFAULT '[]'::jsonb,
    team_visibility BOOLEAN DEFAULT false,
    cleaning_visibility BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 2. PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    nik TEXT,                              -- Nomor Induk Karyawan
    role TEXT CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
    position TEXT,                         -- Jabatan spesifik: "Kasir Senior", "Staff Gudang", dll
    status TEXT CHECK (status IN ('aktif', 'cuti', 'resign')) DEFAULT 'aktif',
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions to avoid RLS recursion on profiles (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_auth_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop existing policies if they exist to make script rerun-safe
DROP POLICY IF EXISTS "stores_select_associated" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_authenticated" ON public.stores;
DROP POLICY IF EXISTS "stores_update_manager" ON public.stores;

DROP POLICY IF EXISTS "profiles_select_same_store" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_manager" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Stores policies
CREATE POLICY "stores_select_associated" ON public.stores FOR SELECT USING (
  id = public.get_auth_store_id()
  OR (public.get_auth_store_id() IS NULL)
);

CREATE POLICY "stores_insert_authenticated" ON public.stores FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "stores_update_manager" ON public.stores FOR UPDATE USING (
  id = public.get_auth_store_id()
  AND public.get_auth_role() IN ('admin', 'manager')
);

-- Profiles policies
-- Manager/staff/admin can select profiles in the same store, or user can select their own profile
-- ATAU jika toko tersebut mengaktifkan team_visibility = true
CREATE POLICY "profiles_select_visibility"
  ON public.profiles FOR SELECT
  USING (
    store_id = public.get_auth_store_id()
    OR auth_user_id = auth.uid()
    OR store_id IN (SELECT id FROM public.stores WHERE team_visibility = true)
  );

-- CRITICAL: User dapat selalu membuat baris profil miliknya sendiri (auth_user_id = auth.uid()).
-- Ini diperlukan ketika trigger database belum membuatkan baris profil secara otomatis
-- (misalnya user sudah ada sebelum tabel/trigger disiapkan).
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Manager/admin can insert OTHER members (staff) to their own store
CREATE POLICY "profiles_insert_manager"
  ON public.profiles FOR INSERT
  WITH CHECK (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

-- Manager/admin can update members in their own store
CREATE POLICY "profiles_update_manager"
  ON public.profiles FOR UPDATE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

-- Manager/admin can delete members in their own store (except themselves)
CREATE POLICY "profiles_delete_manager"
  ON public.profiles FOR DELETE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
    AND id != auth.uid()
  );

-- User can always update their own profile details
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_same_store" ON public.tasks;

CREATE POLICY "tasks_same_store"
  ON public.tasks FOR ALL
  USING (
    store_id = public.get_auth_store_id()
  );

-- 4. DOCUMENTS TABLE (SOP/WI)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('sop', 'wi', 'policy', 'other')) DEFAULT 'other',
    file_url TEXT NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_same_store" ON public.documents;

CREATE POLICY "documents_same_store"
  ON public.documents FOR ALL
  USING (
    store_id = public.get_auth_store_id()
  );

-- 5. GENERAL CLEANING TABLE
CREATE TABLE IF NOT EXISTS public.general_cleaning (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    area_equipment TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')) DEFAULT 'pending',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    before_photo_url TEXT,
    progress_photo_url TEXT,
    after_photo_url TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.general_cleaning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleaning_same_store" ON public.general_cleaning;

CREATE POLICY "cleaning_select_visibility"
  ON public.general_cleaning FOR SELECT
  USING (
    store_id = public.get_auth_store_id()
    OR store_id IN (SELECT id FROM public.stores WHERE cleaning_visibility = true)
  );

CREATE POLICY "cleaning_insert_same_store"
  ON public.general_cleaning FOR INSERT
  WITH CHECK (store_id = public.get_auth_store_id());

CREATE POLICY "cleaning_update_same_store"
  ON public.general_cleaning FOR UPDATE
  USING (store_id = public.get_auth_store_id());

CREATE POLICY "cleaning_delete_same_store"
  ON public.general_cleaning FOR DELETE
  USING (store_id = public.get_auth_store_id());

-- 6. Storage Buckets (automatically configured)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cleaning_photos', 'cleaning_photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('avatars', 'documents', 'cleaning_photos'));

DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates" 
ON storage.objects FOR UPDATE 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Helper trigger to auto-create profile when a user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Cek jika ada placeholder profile untuk email ini
  UPDATE public.profiles
  SET auth_user_id = NEW.id
  WHERE email = NEW.email;
  
  -- Jika tidak ada placeholder, buat profile baru
  IF NOT FOUND THEN
    INSERT INTO public.profiles (auth_user_id, email, full_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── UPDATE: Tambahkan kolom baru ke tabel `stores` jika tabel sudah ada ───
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS custom_positions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS team_visibility BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cleaning_visibility BOOLEAN DEFAULT false;

-- ─── UPDATE: Migrasi tabel `profiles` untuk memisahkan id dan auth_user_id ───
-- 1. Tambahkan kolom auth_user_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Isi auth_user_id dengan id yang lama (karena sebelumnya id = auth.users.id)
UPDATE public.profiles SET auth_user_id = id WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- 3. Jadikan auth_user_id UNIQUE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);

-- 4. Hapus foreign key lama dari id ke auth.users (Constraint name biasanya profiles_id_fkey)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 5. Ubah default value id menjadi auto generate UUID
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── UPDATE: Tambahkan kolom baru ke tabel `general_cleaning` ───────────────
-- Kolom location_type: kategori lokasi (Area / Equipment / Mesin / Lainnya)
ALTER TABLE public.general_cleaning
  ADD COLUMN IF NOT EXISTS location_type TEXT;

-- Kolom notes: catatan dari staff saat upload foto
ALTER TABLE public.general_cleaning
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── UPDATE: Tambahkan kolom reference_photo_url ke tabel `general_cleaning` ─
-- Kolom reference_photo_url: foto referensi area/equipment yang diunggah manager saat membuat tugas
ALTER TABLE public.general_cleaning
  ADD COLUMN IF NOT EXISTS reference_photo_url TEXT;

-- ─── UPDATE: Tambahkan kolom file_path dan file_size ke tabel `documents` ─────
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT;
