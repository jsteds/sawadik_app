-- Script to merge duplicate stores in the database.
-- Run this script in the Supabase SQL Editor.
-- What this does:
-- 1. Finds all stores with the exact same name.
-- 2. Picks the oldest one as the "primary" store.
-- 3. Updates all references (profiles, tasks, documents, general_cleaning, daily_cleaning) 
--    from the duplicate stores to point to the primary store.
-- 4. Deletes the duplicate stores.

DO $$
DECLARE
    store_record RECORD;
    primary_store_id UUID;
    dupe_store_id UUID;
BEGIN
    -- Find names that have duplicates
    FOR store_record IN
        SELECT name
        FROM public.stores
        GROUP BY name
        HAVING count(id) > 1
    LOOP
        -- Get the primary store ID (the one created first)
        SELECT id INTO primary_store_id
        FROM public.stores
        WHERE name = store_record.name
        ORDER BY created_at ASC
        LIMIT 1;

        -- Loop through all duplicate store IDs for this name
        FOR dupe_store_id IN
            SELECT id
            FROM public.stores
            WHERE name = store_record.name AND id != primary_store_id
        LOOP
            -- Update dependent tables to point to the primary store
            UPDATE public.profiles SET store_id = primary_store_id WHERE store_id = dupe_store_id;
            UPDATE public.tasks SET store_id = primary_store_id WHERE store_id = dupe_store_id;
            UPDATE public.documents SET store_id = primary_store_id WHERE store_id = dupe_store_id;
            UPDATE public.general_cleaning SET store_id = primary_store_id WHERE store_id = dupe_store_id;
            UPDATE public.daily_cleaning SET store_id = primary_store_id WHERE store_id = dupe_store_id;

            -- Delete the duplicate store
            DELETE FROM public.stores WHERE id = dupe_store_id;
        END LOOP;
    END LOOP;
END $$;
