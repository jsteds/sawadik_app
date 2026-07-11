-- Migration: Add managed_store_ids column to profiles for Area Manager store scope
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS managed_store_ids UUID[] DEFAULT NULL;

-- Optional: index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_managed_store_ids
  ON profiles USING GIN (managed_store_ids);

COMMENT ON COLUMN profiles.managed_store_ids IS
  'Array of store IDs under Area Manager supervision. NULL means all stores (for super_admin compatibility).';
