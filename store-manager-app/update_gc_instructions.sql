-- Menambahkan kolom instructions (catatan/instruksi tambahan dari manager) pada tabel general_cleaning
ALTER TABLE public.general_cleaning
  ADD COLUMN IF NOT EXISTS instructions TEXT;
