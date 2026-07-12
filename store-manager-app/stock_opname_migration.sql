-- Migration: Setup Stock Opname Tables
-- Run this in Supabase SQL Editor

-- 1. stock_opname_sessions
CREATE TABLE IF NOT EXISTS public.stock_opname_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, uploaded
    started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. stock_opname_items (Data dari Repot.in)
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.stock_opname_sessions(id) ON DELETE CASCADE,
    article_code VARCHAR(255),
    item_name VARCHAR(255) NOT NULL,
    system_qty INTEGER DEFAULT 0, -- dari sistem (jika ada)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. stock_opname_locations (Lokasi hitung, misal "Rak Depan")
CREATE TABLE IF NOT EXISTS public.stock_opname_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.stock_opname_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. stock_opname_counts (Hasil hitung per lokasi)
CREATE TABLE IF NOT EXISTS public.stock_opname_counts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.stock_opname_locations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.stock_opname_items(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL DEFAULT 0,
    counted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location_id, item_id) -- satu item hanya punya 1 total per lokasi
);

-- RLS Policies
ALTER TABLE public.stock_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_counts ENABLE ROW LEVEL SECURITY;

-- Untuk MVP: bypass RLS atau sesuaikan dengan auth (contoh allow all for authenticated)
CREATE POLICY "Allow authenticated read stock_opname_sessions" ON public.stock_opname_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert stock_opname_sessions" ON public.stock_opname_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update stock_opname_sessions" ON public.stock_opname_sessions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read stock_opname_items" ON public.stock_opname_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert stock_opname_items" ON public.stock_opname_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update stock_opname_items" ON public.stock_opname_items FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read stock_opname_locations" ON public.stock_opname_locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert stock_opname_locations" ON public.stock_opname_locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update stock_opname_locations" ON public.stock_opname_locations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete stock_opname_locations" ON public.stock_opname_locations FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read stock_opname_counts" ON public.stock_opname_counts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert stock_opname_counts" ON public.stock_opname_counts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update stock_opname_counts" ON public.stock_opname_counts FOR UPDATE USING (auth.role() = 'authenticated');
