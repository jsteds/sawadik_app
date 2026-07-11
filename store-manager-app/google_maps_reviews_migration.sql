-- ─── Google Maps Reviews Migration ──────────────────────────────────────────────
-- v1.0: Tables for storing Google Maps config, reviews, and sentiment summaries

-- 1. STORE GOOGLE MAPS CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.store_google_maps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
    google_maps_url TEXT NOT NULL,
    place_id TEXT,
    place_name TEXT,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.store_google_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_google_maps_select" ON public.store_google_maps;
CREATE POLICY "store_google_maps_select"
  ON public.store_google_maps FOR SELECT
  USING (store_id = public.get_auth_store_id());

DROP POLICY IF EXISTS "store_google_maps_insert" ON public.store_google_maps;
CREATE POLICY "store_google_maps_insert"
  ON public.store_google_maps FOR INSERT
  WITH CHECK (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "store_google_maps_update" ON public.store_google_maps;
CREATE POLICY "store_google_maps_update"
  ON public.store_google_maps FOR UPDATE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "store_google_maps_delete" ON public.store_google_maps;
CREATE POLICY "store_google_maps_delete"
  ON public.store_google_maps FOR DELETE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

-- 2. GOOGLE MAPS REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.google_maps_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    reviewer_name TEXT,
    review_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_date TIMESTAMP WITH TIME ZONE,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score FLOAT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    google_review_id TEXT UNIQUE
);

ALTER TABLE public.google_maps_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_same_store" ON public.google_maps_reviews;
CREATE POLICY "reviews_select_same_store"
  ON public.google_maps_reviews FOR SELECT
  USING (store_id = public.get_auth_store_id());

DROP POLICY IF EXISTS "reviews_insert_manager" ON public.google_maps_reviews;
CREATE POLICY "reviews_insert_manager"
  ON public.google_maps_reviews FOR INSERT
  WITH CHECK (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "reviews_update_manager" ON public.google_maps_reviews;
CREATE POLICY "reviews_update_manager"
  ON public.google_maps_reviews FOR UPDATE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "reviews_delete_manager" ON public.google_maps_reviews;
CREATE POLICY "reviews_delete_manager"
  ON public.google_maps_reviews FOR DELETE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

-- 3. REVIEW SENTIMENT SUMMARY TABLE
CREATE TABLE IF NOT EXISTS public.review_sentiment_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_reviews INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    average_rating FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.review_sentiment_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sentiment_summary_select" ON public.review_sentiment_summary;
CREATE POLICY "sentiment_summary_select"
  ON public.review_sentiment_summary FOR SELECT
  USING (store_id = public.get_auth_store_id());

DROP POLICY IF EXISTS "sentiment_summary_insert" ON public.review_sentiment_summary;
CREATE POLICY "sentiment_summary_insert"
  ON public.review_sentiment_summary FOR INSERT
  WITH CHECK (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "sentiment_summary_update" ON public.review_sentiment_summary;
CREATE POLICY "sentiment_summary_update"
  ON public.review_sentiment_summary FOR UPDATE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "sentiment_summary_delete" ON public.review_sentiment_summary;
CREATE POLICY "sentiment_summary_delete"
  ON public.review_sentiment_summary FOR DELETE
  USING (
    store_id = public.get_auth_store_id()
    AND public.get_auth_role() IN ('admin', 'manager')
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_store_date ON public.google_maps_reviews(store_id, review_date);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.google_maps_reviews(store_id, sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiment_summary_store ON public.review_sentiment_summary(store_id, period_start, period_end);
