-- ============================================================
-- Migrasi lengkap Stock Opname
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- Pastikan kolom-kolom yang dibutuhkan ada di stock_opname_items
ALTER TABLE stock_opname_items
  ADD COLUMN IF NOT EXISTS article_code  text,
  ADD COLUMN IF NOT EXISTS item_name     text,
  ADD COLUMN IF NOT EXISTS uom           text DEFAULT 'EA',
  ADD COLUMN IF NOT EXISTS system_qty    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS site          text,
  ADD COLUMN IF NOT EXISTS name1         text,
  ADD COLUMN IF NOT EXISTS sort_order    integer DEFAULT 0;

-- Pastikan kolom is_complete ada di stock_opname_locations
ALTER TABLE stock_opname_locations
  ADD COLUMN IF NOT EXISTS is_complete   boolean DEFAULT false;

-- Index agar pencarian & sorting cepat
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_session
  ON stock_opname_items (session_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_stock_opname_items_search
  ON stock_opname_items (session_id, article_code, item_name);
