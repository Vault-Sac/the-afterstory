-- ==============================================================================
-- THE AFTERSTORY — PEOPLE PHOTO SUBMISSIONS MIGRATION
-- Migration Version: 20261015100000
-- Purpose: End-to-end public photo submission + admin moderation workflow
-- Security: RLS enforced, SECURITY DEFINER approval function, private bucket
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: people_submissions
-- Receives anonymous/public photo & profile submissions for admin review.
-- Intentionally separate from public.people to keep the approved gallery clean.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people_submissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   TEXT NOT NULL CHECK (char_length(full_name) >= 1 AND char_length(full_name) <= 120),
    nickname    TEXT CHECK (nickname IS NULL OR char_length(nickname) <= 60),
    role_titile TEXT CHECK (role_titile IS NULL OR char_length(role_titile) <= 120),
    favourite_quote TEXT CHECK (favourite_quote IS NULL OR char_length(favourite_quote) <= 300),
    bio         TEXT CHECK (bio IS NULL OR char_length(bio) <= 2000),
    avatar_path TEXT,          -- storage object path in 'submissions' bucket (private)
    avatar_url  TEXT,          -- set on approval when image becomes accessible
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,     -- internal admin note, never exposed to public
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_submissions_status
    ON public.people_submissions(status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. ENABLE RLS on people_submissions
-- ------------------------------------------------------------------------------
ALTER TABLE public.people_submissions ENABLE ROW LEVEL SECURITY;

-- 2a. Public/anonymous users may INSERT new submissions only if:
--   - status = 'pending'
--   - reviewer fields are NULL (cannot self-approve)
--   - avatar_url cannot be set by submitter
DROP POLICY IF EXISTS "Public can submit people profiles" ON public.people_submissions;
CREATE POLICY "Public can submit people profiles" ON public.people_submissions
    FOR INSERT WITH CHECK (
        status = 'pending' AND
        reviewed_by IS NULL AND
        reviewed_at IS NULL AND
        rejection_reason IS NULL AND
        avatar_url IS NULL AND
        char_length(full_name) >= 1 AND
        char_length(full_name) <= 120
    );

-- 2b. Admins can read all submissions (any status)
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.people_submissions;
CREATE POLICY "Admins can view all submissions" ON public.people_submissions
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- 2c. Admins can update/delete submissions (for approval/rejection/editing)
DROP POLICY IF EXISTS "Admins can moderate submissions" ON public.people_submissions;
CREATE POLICY "Admins can moderate submissions" ON public.people_submissions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 3. SECURITY DEFINER FUNCTION: approve_people_submission
-- Validates admin privilege server-side, creates/updates public.people record,
-- and marks submission as approved atomically.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_people_submission(
    submission_id UUID,
    final_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    sub RECORD;
    person_id TEXT;
    derived_slug TEXT;
    result JSONB;
BEGIN
    -- 1. Authorize: only verified admins may call this
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: admin privileges required to approve submissions.';
    END IF;

    -- 2. Load the submission
    SELECT * INTO sub
    FROM public.people_submissions
    WHERE id = submission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission % not found.', submission_id;
    END IF;

    IF sub.status = 'approved' THEN
        RETURN '{"already_approved": true}'::jsonb;
    END IF;

    -- 3. Derive slug from full_name
    derived_slug := lower(regexp_replace(sub.full_name, '[^a-zA-Z0-9]+', '-', 'g'));
    derived_slug := trim(both '-' from derived_slug);

    -- Ensure slug uniqueness by appending short UUID suffix if collision
    IF EXISTS (SELECT 1 FROM public.people WHERE slug = derived_slug) THEN
        derived_slug := derived_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    END IF;

    -- 4. Insert into public.people
    person_id := gen_random_uuid()::text;

    INSERT INTO public.people (
        id,
        slug,
        full_name,
        nickname,
        role_titile,
        avatar_url,
        favourite_quote,
        bio,
        status,
        display_order,
        created_at
    ) VALUES (
        person_id,
        derived_slug,
        sub.full_name,
        sub.nickname,
        sub.role_titile,
        COALESCE(final_avatar_url, sub.avatar_url),
        sub.favourite_quote,
        sub.bio,
        'published',
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.people),
        NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
        full_name       = EXCLUDED.full_name,
        nickname        = EXCLUDED.nickname,
        role_titile     = EXCLUDED.role_titile,
        avatar_url      = COALESCE(EXCLUDED.avatar_url, public.people.avatar_url),
        favourite_quote = EXCLUDED.favourite_quote,
        bio             = EXCLUDED.bio,
        status          = 'published';

    -- 5. Mark submission approved
    UPDATE public.people_submissions SET
        status      = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        avatar_url  = COALESCE(final_avatar_url, avatar_url),
        updated_at  = NOW()
    WHERE id = submission_id;

    -- 6. Return the created/updated people record
    SELECT row_to_json(p)::jsonb INTO result
    FROM public.people p
    WHERE p.slug = derived_slug;

    RETURN COALESCE(result, '{"approved": true}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_people_submission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_people_submission(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. SECURITY DEFINER FUNCTION: reject_people_submission
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_people_submission(
    submission_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: admin privileges required to reject submissions.';
    END IF;

    UPDATE public.people_submissions SET
        status           = 'rejected',
        rejection_reason = reason,
        reviewed_by      = auth.uid(),
        reviewed_at      = NOW(),
        updated_at       = NOW()
    WHERE id = submission_id;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_people_submission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_people_submission(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. STORAGE: Private 'submissions' bucket for pending photos
-- Public=false ensures no predictable URL access to unreviewed photos.
-- Admins retrieve images via signed URLs (time-limited, server-authorized).
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions',
    'submissions',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 5a. Anyone (anon or authenticated) may upload to the submissions bucket
DROP POLICY IF EXISTS "Anyone can upload submission photos" ON storage.objects;
CREATE POLICY "Anyone can upload submission photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'submissions'
    );

-- 5b. Only admins can read/download objects from the private submissions bucket
DROP POLICY IF EXISTS "Admins can view submission photos" ON storage.objects;
CREATE POLICY "Admins can view submission photos" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'submissions' AND
        public.is_admin(auth.uid())
    );

-- 5c. Only admins can delete submission objects (for cleanup on rejection)
DROP POLICY IF EXISTS "Admins can delete submission photos" ON storage.objects;
CREATE POLICY "Admins can delete submission photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'submissions' AND
        public.is_admin(auth.uid())
    );

-- ==============================================================================
-- END OF MIGRATION 20261015100000
-- ==============================================================================
