-- Rename the "location" column to "code" in the stores table.
-- Please execute this script manually in the Supabase SQL Editor.

ALTER TABLE public.stores RENAME COLUMN location TO code;
