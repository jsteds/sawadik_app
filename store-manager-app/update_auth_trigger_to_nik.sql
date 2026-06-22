-- Script untuk mengubah trigger pendaftaran agar mencocokkan NIK alih-alih Email.
-- Jalankan script ini di Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  linked_profile_id UUID;
BEGIN
  -- 1. Cek jika NIK diisi saat pendaftaran, cari placeholder profile berdasarkan NIK
  IF NEW.raw_user_meta_data->>'nik' IS NOT NULL AND NEW.raw_user_meta_data->>'nik' != '' THEN
    UPDATE public.profiles
    SET auth_user_id = NEW.id,
        email = NEW.email, -- Update email mengikuti email yang didaftarkan member
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name)
    WHERE nik = NEW.raw_user_meta_data->>'nik' AND auth_user_id IS NULL
    RETURNING id INTO linked_profile_id;
  END IF;

  -- 2. Jika tidak ada placeholder yang tertaut (atau NIK tidak diisi), buat profile baru
  IF linked_profile_id IS NULL THEN
    INSERT INTO public.profiles (auth_user_id, email, full_name, nik)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'nik'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
