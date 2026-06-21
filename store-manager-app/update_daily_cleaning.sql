-- Update daily_cleaning to include assigned_to

-- Tambahkan kolom assigned_to
ALTER TABLE public.daily_cleaning 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Supaya aman, izinkan assignee melihat tugasnya.
-- Karena RLS pada daily_cleaning adalah:
-- USING (store_id = public.get_auth_store_id());
-- Maka semua orang di toko yang sama sudah bisa melihat/mengedit tugas tersebut, 
-- sehingga RLS tidak perlu diubah.
