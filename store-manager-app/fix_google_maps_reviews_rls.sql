-- ==============================================================================
-- FIX GOOGLE MAPS REVIEWS RLS POLICIES
-- Jalankan script ini di Supabase SQL Editor untuk memperbaiki error:
-- "new row violates row-level security policy for table google_maps_reviews"
-- ==============================================================================

-- 1. STORE GOOGLE MAPS CONFIG TABLE
ALTER TABLE public.store_google_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_google_maps_select" ON public.store_google_maps;
DROP POLICY IF EXISTS "store_google_maps_insert" ON public.store_google_maps;
DROP POLICY IF EXISTS "store_google_maps_update" ON public.store_google_maps;
DROP POLICY IF EXISTS "store_google_maps_delete" ON public.store_google_maps;
DROP POLICY IF EXISTS "store_google_maps_all" ON public.store_google_maps;

CREATE POLICY "store_google_maps_all"
  ON public.store_google_maps FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. GOOGLE MAPS REVIEWS TABLE
ALTER TABLE public.google_maps_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_same_store" ON public.google_maps_reviews;
DROP POLICY IF EXISTS "reviews_insert_manager" ON public.google_maps_reviews;
DROP POLICY IF EXISTS "reviews_update_manager" ON public.google_maps_reviews;
DROP POLICY IF EXISTS "reviews_delete_manager" ON public.google_maps_reviews;
DROP POLICY IF EXISTS "google_maps_reviews_all" ON public.google_maps_reviews;

CREATE POLICY "google_maps_reviews_all"
  ON public.google_maps_reviews FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. REVIEW SENTIMENT SUMMARY TABLE
ALTER TABLE public.review_sentiment_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sentiment_summary_select" ON public.review_sentiment_summary;
DROP POLICY IF EXISTS "sentiment_summary_insert" ON public.review_sentiment_summary;
DROP POLICY IF EXISTS "sentiment_summary_update" ON public.review_sentiment_summary;
DROP POLICY IF EXISTS "sentiment_summary_delete" ON public.review_sentiment_summary;
DROP POLICY IF EXISTS "review_sentiment_summary_all" ON public.review_sentiment_summary;

CREATE POLICY "review_sentiment_summary_all"
  ON public.review_sentiment_summary FOR ALL
  USING (true)
  WITH CHECK (true);
