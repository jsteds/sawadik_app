-- Daily Cleaning Schema
CREATE TABLE IF NOT EXISTS public.daily_cleaning (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    shift TEXT CHECK (shift IN ('Opening', 'Mid', 'Closing', 'Lainnya')) DEFAULT 'Opening',
    task_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_cleaning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_cleaning_same_store" ON public.daily_cleaning;

CREATE POLICY "daily_cleaning_same_store"
  ON public.daily_cleaning FOR ALL
  USING (store_id = public.get_auth_store_id());

-- To make the UI update in real-time or just properly managed, we don't necessarily need more complex policies 
-- since get_auth_store_id() covers all CRUD operations for the store.
