-- ==============================================================================
-- THE AFTERSTORY / THE MEMORY VAULT — PRODUCTION SCHEMA & SECURITY MIGRATION
-- Migration Version: 20261015000000
-- Security Model: Explicit Role-Based Authorization, RLS, Storage Hardening
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLE: site_settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABLE: destinations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destinations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    chapter_title TEXT,
    tagline TEXT,
    description TEXT,
    hero_image TEXT,
    dates TEXT,
    display_order INTEGER DEFAULT 1,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    latitude NUMERIC,
    longitude NUMERIC,
    color TEXT,
    highlights JSONB DEFAULT '[]'::jsonb,
    travel_tips JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TABLE: journey_days
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journey_days (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    trip_date DATE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    place TEXT,
    description TEXT,
    time_note TEXT,
    moments JSONB DEFAULT '[]'::jsonb,
    image TEXT,
    destinations JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 1,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABLE: activities
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journey_day_id TEXT REFERENCES public.journey_days(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    time_note TEXT,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. TABLE: media
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    storage_path TEXT,
    public_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    alt_text TEXT,
    destination_id TEXT,
    journey_day_id TEXT,
    publication_status TEXT DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. TABLE: people
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    role_title TEXT,
    avatar_url TEXT,
    favorite_quote TEXT,
    bio TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABLE: memories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    body TEXT NOT NULL CHECK (char_length(body) >= 5 AND char_length(body) <= 5000),
    display_name TEXT NOT NULL DEFAULT 'Anonymous Traveler',
    category TEXT,
    destination_id TEXT,
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. TABLE: memory_media
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_media (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    memory_id TEXT REFERENCES public.memories(id) ON DELETE CASCADE,
    media_id TEXT REFERENCES public.media(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TABLE: guestbook_entries
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guestbook_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    display_name TEXT NOT NULL CHECK (char_length(display_name) <= 80),
    message TEXT NOT NULL CHECK (char_length(message) >= 2 AND char_length(message) <= 2000),
    location TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. TABLE: admin_users (Explicit Administrator Registry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_destinations_slug ON public.destinations(slug);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON public.destinations(display_order);
CREATE INDEX IF NOT EXISTS idx_journey_days_order ON public.journey_days(display_order);
CREATE INDEX IF NOT EXISTS idx_media_dest ON public.media(destination_id);
CREATE INDEX IF NOT EXISTS idx_memories_status ON public.memories(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_order ON public.people(display_order);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);

-- ==============================================================================
-- AUTHORIZATION FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Secure function to check whether a user possesses active administrator privileges.
-- search_path is strictly pinned to public, auth to eliminate path hijacking.
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = user_uuid
          AND role IN ('admin', 'superadmin')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;

-- Helper function to grant admin privileges to an existing auth user by email
CREATE OR REPLACE FUNCTION public.add_admin_by_email(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_id UUID;
    norm_email TEXT := lower(trim(admin_email));
BEGIN
    -- Only existing administrators or postgres service role can call this
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: only verified administrators can register new admins.';
    END IF;

    SELECT id INTO target_id FROM auth.users WHERE lower(email) = norm_email;
    IF target_id IS NULL THEN
        RAISE EXCEPTION 'User % does not exist in auth.users. Please create the user first in Supabase Auth.', norm_email;
    END IF;

    INSERT INTO public.admin_users (user_id, email, role, created_by)
    VALUES (target_id, norm_email, 'admin', auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN 'Success: Admin access granted to ' || norm_email;
END;
$$;

REVOKE ALL ON FUNCTION public.add_admin_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(TEXT) TO authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 1. admin_users RLS
-- Users can inspect their own role, or admins can view all admin records.
-- Ordinary users CANNOT insert, update, or delete from this table.
DROP POLICY IF EXISTS "Users view own admin record or admins view all" ON public.admin_users;
CREATE POLICY "Users view own admin record or admins view all" ON public.admin_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage admin users" ON public.admin_users;
CREATE POLICY "Admins can manage admin users" ON public.admin_users
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 2. site_settings RLS
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings" ON public.site_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 3. destinations RLS
-- Anonymous/non-admin users see ONLY published destinations.
-- Only verified admins can view drafts or perform inserts/updates/deletes.
DROP POLICY IF EXISTS "Public can view published destinations" ON public.destinations;
CREATE POLICY "Public can view published destinations" ON public.destinations
    FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;
CREATE POLICY "Admins can manage destinations" ON public.destinations
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 4. journey_days RLS
DROP POLICY IF EXISTS "Public can view published journey days" ON public.journey_days;
CREATE POLICY "Public can view published journey days" ON public.journey_days
    FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage journey days" ON public.journey_days;
CREATE POLICY "Admins can manage journey days" ON public.journey_days
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 5. activities RLS
DROP POLICY IF EXISTS "Public can view activities" ON public.activities;
CREATE POLICY "Public can view activities" ON public.activities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities" ON public.activities
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 6. media RLS
DROP POLICY IF EXISTS "Public can view published media" ON public.media;
CREATE POLICY "Public can view published media" ON public.media
    FOR SELECT USING (publication_status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage media" ON public.media;
CREATE POLICY "Admins can manage media" ON public.media
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 7. people RLS
DROP POLICY IF EXISTS "Public can view published people" ON public.people;
CREATE POLICY "Public can view published people" ON public.people
    FOR SELECT USING (status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage people" ON public.people;
CREATE POLICY "Admins can manage people" ON public.people
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 8. memories RLS
-- Unapproved/pending memories are strictly hidden from public and non-admin users.
DROP POLICY IF EXISTS "Public can view approved memories" ON public.memories;
CREATE POLICY "Public can view approved memories" ON public.memories
    FOR SELECT USING (moderation_status = 'approved' OR public.is_admin(auth.uid()));

-- Non-admin visitors can only insert memories as 'pending' with approved_at NULL and length limits.
DROP POLICY IF EXISTS "Public can submit pending memories" ON public.memories;
CREATE POLICY "Public can submit pending memories" ON public.memories
    FOR INSERT WITH CHECK (
        moderation_status = 'pending' AND
        approved_at IS NULL AND
        char_length(body) >= 5 AND
        char_length(body) <= 5000 AND
        char_length(display_name) <= 80 AND
        (title IS NULL OR char_length(title) <= 120)
    );

-- Only verified admins can approve, reject, edit, or delete memories.
DROP POLICY IF EXISTS "Admins can manage memories" ON public.memories;
CREATE POLICY "Admins can manage memories" ON public.memories
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 9. memory_media RLS
DROP POLICY IF EXISTS "Public can view memory media links" ON public.memory_media;
CREATE POLICY "Public can view memory media links" ON public.memory_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage memory media links" ON public.memory_media;
CREATE POLICY "Admins can manage memory media links" ON public.memory_media
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 10. guestbook_entries RLS
DROP POLICY IF EXISTS "Public can view approved guestbook entries" ON public.guestbook_entries;
CREATE POLICY "Public can view approved guestbook entries" ON public.guestbook_entries
    FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can submit guestbook entries" ON public.guestbook_entries;
CREATE POLICY "Public can submit guestbook entries" ON public.guestbook_entries
    FOR INSERT WITH CHECK (
        status = 'pending' AND
        char_length(message) >= 2 AND
        char_length(message) <= 2000 AND
        char_length(display_name) <= 80
    );

DROP POLICY IF EXISTS "Admins can manage guestbook entries" ON public.guestbook_entries;
CREATE POLICY "Admins can manage guestbook entries" ON public.guestbook_entries
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION & POLICIES
-- ==============================================================================

-- Create 'gallery' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies
DROP POLICY IF EXISTS "Public can view gallery objects" ON storage.objects;
CREATE POLICY "Public can view gallery objects" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery');

-- Strictly require public.is_admin(auth.uid()) for uploading, updating, and deleting gallery objects
DROP POLICY IF EXISTS "Admins can upload gallery objects" ON storage.objects;
CREATE POLICY "Admins can upload gallery objects" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'gallery' AND
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update gallery objects" ON storage.objects;
CREATE POLICY "Admins can update gallery objects" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'gallery' AND
        public.is_admin(auth.uid())
    )
    WITH CHECK (
        bucket_id = 'gallery' AND
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admins can delete gallery objects" ON storage.objects;
CREATE POLICY "Admins can delete gallery objects" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'gallery' AND
        public.is_admin(auth.uid())
    );

-- ==============================================================================
-- IDEMPOTENT INITIAL SEED DATA
-- ==============================================================================

-- Site settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
    ('site_title', 'THE AFTERSTORY'),
    ('site_edition', 'OCTOBER ''26'),
    ('site_tagline', 'Some journeys end. Their stories don''t.'),
    ('hero_title', 'Not just a trip.'),
    ('hero_subtitle', 'A piece of us.'),
    ('hero_description', 'Six days across changing landscapes, familiar voices, and moments we don''t want time to take away. This is where we keep them.'),
    ('route_summary', 'VARANASI — SHIMLA — CHANDIGARH'),
    ('trip_dates', '15 — 20 OCTOBER 2026'),
    ('footer_note', 'Made of moments, kept with care.'),
    ('about_text', 'The Afterstory is a private digital archive for the October 2026 group journey from Varanasi through Shimla and Chandigarh.')
ON CONFLICT (setting_key) DO NOTHING;

-- Destinations
INSERT INTO public.destinations (id, slug, name, chapter_title, tagline, description, hero_image, dates, display_order, status, latitude, longitude, color) VALUES
    ('varanasi', 'varanasi', 'Varanasi', 'The Beginning', 'Where the journey always starts.', 'The group''s home city and the starting point of the October journey. Bags packed, group chat alive — the departure from Varanasi for Prayagraj Sangam railway station marks chapter one.', 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?auto=format&fit=crop&w=1600&q=90', '15 Oct · Departure', 1, 'published', 25.3176, 82.9739, '#8B6B3D'),
    ('prayagraj', 'prayagraj', 'Prayagraj', 'The Gathering', 'The station where it all came together.', 'Prayagraj Sangam railway station — the meeting point where the group assembled before boarding the overnight train toward Chandigarh. The Sangam''s sacred confluence watched the departure.', 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=1600&q=90', '15 Oct · Evening', 2, 'published', 25.4358, 81.8463, '#5C7A5A'),
    ('chandigarh', 'chandigarh', 'Chandigarh', 'The Gateway', 'Planned, beautiful, and alive.', 'Chandigarh — the city of gardens and sectors. Arrival on 16 October, gateway to the hills. Return on 19 October for Rock Garden, Rose Garden, Sukhna Lake, and the overnight train home.', 'https://images.unsplash.com/photo-1597149490014-7d96b7a78e14?auto=format&fit=crop&w=1600&q=90', '16 Oct (Arrival) · 19 Oct (Last Day)', 3, 'published', 30.7333, 76.7794, '#4A6B8A'),
    ('shimla', 'shimla', 'Shimla', 'The Mountains', 'Where the air gets thin and the views get wide.', 'Shimla — the queen of hill stations. Ridge, Mall Road, crisp mountain air, hotel evenings and misty mornings. The heart of the October journey.', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=90', '16–18 Oct', 4, 'published', 31.1048, 77.1734, '#3D5A3E'),
    ('kufri', 'kufri', 'Kufri & Apple Garden', 'The Adventure', 'A little closer to the clouds.', 'Kufri — a short drive from Shimla into higher altitude. Apple orchards, viewpoints, and a trek with a tracker. The itinerary notes optional activities; what actually happened belongs to the group.', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=90', '17 Oct', 5, 'published', 31.0974, 77.2642, '#4A6B4A'),
    ('kalka-shimla-railway', 'kalka-shimla-railway', 'Kalka–Shimla Railway', 'The Ride', 'A journey inside the journey.', 'The heritage narrow-gauge toy train from Shimla to Kalka — a UNESCO World Heritage route through 102 tunnels, 800+ bridges, and endless mountain curves. Departure 8:30 AM on 18 October.', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=90', '18 Oct · Morning', 6, 'published', 30.8956, 76.9942, '#6B4A3D'),
    ('pinjore', 'pinjore', 'Pinjore Gardens', 'The Stop', 'Terraced beauty between mountains and plains.', 'Yadavindra Gardens at Pinjore — the Mughal-style terraced gardens visited on the way back from Kalka. A quiet, beautiful stop before checking into Chandigarh for the final night.', 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1600&q=90', '18 Oct · Afternoon', 7, 'published', 30.7979, 76.9194, '#6B7A4A')
ON CONFLICT (slug) DO NOTHING;

-- Journey Days
INSERT INTO public.journey_days (id, trip_date, title, subtitle, place, description, time_note, moments, image, destinations, display_order, status) VALUES
    ('day-1', '2026-10-15', 'The beginning of somewhere', 'Departure Day', 'Varanasi → Prayagraj Sangam', 'The bags are packed, the group chat is alive, and the journey begins. Board from Varanasi for Prayagraj Sangam railway station, then catch the overnight train toward Chandigarh.', 'Bus at 2:00 PM · Train from Prayagraj evening', '["The departure rush", "First train-window photos", "The first night together"]'::jsonb, 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=85', '["varanasi", "prayagraj"]'::jsonb, 1, 'published'),
    ('day-2', '2026-10-16', 'Hello, Shimla', 'First Mountain Day', 'Chandigarh → Shimla', 'Arrive in Chandigarh at 9:15 AM, have breakfast, and head into the hills. Check in at the hotel, then spend the afternoon around Shimla Ridge and Mall Road.', '9:15 AM arrival Chandigarh · Transfer to Shimla', '["First mountain views", "Ridge & Mall Road", "Dinner and evening together"]'::jsonb, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85', '["chandigarh", "shimla"]'::jsonb, 2, 'published'),
    ('day-3', '2026-10-17', 'A little closer to the clouds', 'Mountain Adventure', 'Kufri · Apple Garden · Shimla', 'Head to Kufri and the Apple Garden. The itinerary mentions an optional horse ride and a short trek with a tracker. Later, visit Sankat Mochan Hanuman Temple and return to the hotel.', 'After breakfast', '["Kufri viewpoints", "The little trek", "Temple visit & evening stories"]'::jsonb, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85', '["kufri", "shimla"]'::jsonb, 3, 'published'),
    ('day-4', '2026-10-18', 'The toy train chapter', 'A Journey Inside the Journey', 'Shimla → Kalka → Chandigarh', 'Leave the hotel for the heritage toy train from Shimla to Kalka. Enjoy the mountain railway views, then visit Pinjore Garden before checking in at Chandigarh for the night.', '8:30 AM departure · Toy train Shimla–Kalka', '["Toy train windows", "Mountain tunnels & bridges", "Pinjore Garden"]'::jsonb, 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=85', '["kalka-shimla-railway", "pinjore", "chandigarh"]'::jsonb, 4, 'published'),
    ('day-5', '2026-10-19', 'One last day, all together', 'The Last Full Day', 'Chandigarh', 'Explore Rock Garden and Rose Garden, have lunch, then head out to Chandigarh''s shopping sectors and Sukhna Lake. In the evening, make your way to the railway station for the overnight train back.', 'After breakfast · Night train departure', '["Rock Garden discoveries", "Sukhna Lake at dusk", "Last-night train memories"]'::jsonb, 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85', '["chandigarh"]'::jsonb, 5, 'published'),
    ('day-6', '2026-10-20', 'Back home, not quite back', 'Until Next Time', 'Train → Varanasi', 'Breakfast and lunch on the train, then arrival in Varanasi at approximately 2:05 PM. The itinerary ends here; the photos, jokes and stories are only just beginning to become memories.', '~2:05 PM arrival Varanasi', '["The final train window", "Goodbyes and group photos", "Save one last memory"]'::jsonb, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85', '["varanasi"]'::jsonb, 6, 'published')
ON CONFLICT (id) DO NOTHING;

-- Initial Media
INSERT INTO public.media (id, public_url, caption, destination_id, publication_status) VALUES
    ('g1', 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=85', 'Somewhere between here and there', 'varanasi', 'published'),
    ('g2', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=85', 'The mountains are calling', 'shimla', 'published'),
    ('g3', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', 'A pause in the hills', 'kufri', 'published'),
    ('g4', 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=85', 'Golden-hour kind of day', 'chandigarh', 'published'),
    ('g5', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=85', 'The toy train windows', 'kalka-shimla-railway', 'published'),
    ('g6', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', 'The journey back', NULL, 'published')
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Memory
INSERT INTO public.memories (id, title, body, display_name, category, moderation_status, approved_at, created_at) VALUES
    ('seed-1', 'A note to begin with', 'This space is for the little things we know we''ll want to remember. Write what you felt, what made you laugh, what you want to keep.', 'The Archive', 'A Letter to Everyone', 'approved', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
