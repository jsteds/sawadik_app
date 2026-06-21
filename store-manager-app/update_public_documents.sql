-- Add `is_public` column to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update `category` check constraint to allow 'gc_report'
-- First, drop the old constraint (the name might vary, usually it's documents_category_check)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;
-- Add the new constraint
ALTER TABLE public.documents ADD CONSTRAINT documents_category_check CHECK (category IN ('sop', 'wi', 'policy', 'gc_report', 'other'));

-- Update RLS Policies for documents
DROP POLICY IF EXISTS "documents_same_store" ON public.documents;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_modify" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

-- SELECT: User can view documents from their own store OR public documents
CREATE POLICY "documents_select" ON public.documents FOR SELECT USING (
  store_id = public.get_auth_store_id() OR is_public = true
);

-- INSERT, UPDATE, DELETE: User can only modify their own store's documents
CREATE POLICY "documents_modify" ON public.documents FOR INSERT WITH CHECK (
  store_id = public.get_auth_store_id()
);

CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (
  store_id = public.get_auth_store_id()
);

CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (
  store_id = public.get_auth_store_id()
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
