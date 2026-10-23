-- ====================================================================
-- XOTIRALARIM DATABASE SCHEMA & MIGRATION
-- Shaxsiy xotiralar va muhim sanalar platformasi
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SYSTEM SETTINGS & SINGLE-USER LOCK
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    registration_locked BOOLEAN NOT NULL DEFAULT false,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert initial singleton config if not exists
INSERT INTO public.system_settings (id, registration_locked)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_path TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    date_format TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
    theme TEXT NOT NULL DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT DEFAULT 'folder',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TAGS TABLE
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
);

-- 6. MEMORIES TABLE
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    location_name TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    mood TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. MEMORY_TAGS (Junction Table)
CREATE TABLE IF NOT EXISTS public.memory_tags (
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (memory_id, tag_id)
);

-- 8. DIARY_ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT NOT NULL,
    entry_date DATE NOT NULL,
    mood TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. IMPORTANT_DATES TABLE
CREATE TABLE IF NOT EXISTS public.important_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date_type TEXT NOT NULL CHECK (date_type IN ('birthday', 'anniversary', 'wedding', 'personal', 'milestone', 'education', 'work', 'other')),
    event_date DATE NOT NULL,
    repeat_yearly BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    recurrence_rule TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. FUTURE_LETTERS (Time Capsule)
CREATE TABLE IF NOT EXISTS public.future_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    unlock_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('draft', 'locked', 'ready', 'opened', 'cancelled')),
    opened_at TIMESTAMPTZ,
    reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. MEDIA_ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE,
    diary_entry_id UUID REFERENCES public.diary_entries(id) ON DELETE CASCADE,
    future_letter_id UUID REFERENCES public.future_letters(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'birthday', 'anniversary', 'future_letter', 'system')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    deduplication_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_dedup UNIQUE (user_id, deduplication_key)
);

-- 14. NOTIFICATION_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    birthday_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    future_letter_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    default_reminder_minutes INTEGER NOT NULL DEFAULT 60,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. PUSH_SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_endpoint UNIQUE (user_id, endpoint)
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_memories_user_date ON public.memories (user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_favorite ON public.memories (user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_memories_archived ON public.memories (user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_memories_category ON public.memories (user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_media_user ON public.media_assets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_memory ON public.media_assets (memory_id);
CREATE INDEX IF NOT EXISTS idx_media_diary ON public.media_assets (diary_entry_id);
CREATE INDEX IF NOT EXISTS idx_media_letter ON public.media_assets (future_letter_id);

CREATE INDEX IF NOT EXISTS idx_diary_user_date ON public.diary_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_important_dates_user ON public.important_dates (user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON public.reminders (user_id, is_active, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_future_letters_unlock ON public.future_letters (user_id, unlock_at, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read_at, created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Har bir jadvalda RLS qat'iy tekshiriladi
-- ====================================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. system_settings RLS: Anyone can check registration_locked to render UI properly
CREATE POLICY "Allow public read on system settings" ON public.system_settings
    FOR SELECT USING (true);

-- 2. profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. categories RLS
CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. tags RLS
CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. memories RLS
CREATE POLICY "Users can manage own memories" ON public.memories
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. memory_tags RLS
CREATE POLICY "Users can manage own memory_tags" ON public.memory_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memories m 
            WHERE m.id = memory_tags.memory_id AND m.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memories m 
            WHERE m.id = memory_tags.memory_id AND m.user_id = auth.uid()
        )
    );

-- 7. diary_entries RLS
CREATE POLICY "Users can manage own diary" ON public.diary_entries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. important_dates RLS
CREATE POLICY "Users can manage own dates" ON public.important_dates
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. reminders RLS
CREATE POLICY "Users can manage own reminders" ON public.reminders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. future_letters RLS
CREATE POLICY "Users can manage own future letters" ON public.future_letters
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. media_assets RLS
CREATE POLICY "Users can manage own media assets" ON public.media_assets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. notifications RLS
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. notification_preferences RLS
CREATE POLICY "Users can manage own notification prefs" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 14. push_subscriptions RLS
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_memories_modtime BEFORE UPDATE ON public.memories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_diary_modtime BEFORE UPDATE ON public.diary_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_dates_modtime BEFORE UPDATE ON public.important_dates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_reminders_modtime BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_letters_modtime BEFORE UPDATE ON public.future_letters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- NEW USER INITIALIZATION TRIGGER & LOCKING REGISTRATION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    -- Check if system already has an owner
    SELECT NOT registration_locked INTO is_first_user FROM public.system_settings WHERE id = 'global';

    -- If registration is already locked, raise exception to disallow any extra user
    IF is_first_user IS FALSE THEN
        RAISE EXCEPTION 'Ro‘yxatdan o‘tish yopiq! Tizim faqat bitta egaga mo‘ljallangan.';
    END IF;

    -- Create profile
    INSERT INTO public.profiles (id, display_name, timezone, theme)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 'Asia/Tashkent', 'dark');

    -- Create default notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id);

    -- Seed standard categories
    INSERT INTO public.categories (user_id, name, color, icon) VALUES
        (NEW.id, 'Bolalik', '#60a5fa', 'baby'),
        (NEW.id, 'Oila', '#f472b6', 'heart'),
        (NEW.id, 'Do‘stlar', '#34d399', 'users'),
        (NEW.id, 'Sayohat', '#fbbf24', 'plane'),
        (NEW.id, 'Ta’lim', '#a78bfa', 'graduation-cap'),
        (NEW.id, 'Ish', '#38bdf8', 'briefcase'),
        (NEW.id, 'Bayramlar', '#f87171', 'sparkles'),
        (NEW.id, 'Shaxsiy yutuqlar', '#e879f9', 'trophy'),
        (NEW.id, 'Boshqa', '#9ca3af', 'bookmark');

    -- Lock future registrations permanently & set owner
    UPDATE public.system_settings 
    SET registration_locked = true, owner_user_id = NEW.id, updated_at = now()
    WHERE id = 'global';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connect trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- SECURE FUNCTION FOR FUTURE LETTERS
-- Server-side check that redacts letter content if unlock_at is in the future!
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_safe_future_letters(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    body TEXT,
    unlock_at TIMESTAMPTZ,
    timezone TEXT,
    status TEXT,
    opened_at TIMESTAMPTZ,
    reminder_enabled BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_unlocked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fl.id,
        fl.user_id,
        fl.title,
        CASE 
            WHEN timezone('utc'::text, now()) >= fl.unlock_at THEN fl.body
            ELSE NULL
        END AS body,
        fl.unlock_at,
        fl.timezone,
        CASE 
            WHEN fl.status = 'cancelled' THEN 'cancelled'
            WHEN fl.status = 'draft' THEN 'draft'
            WHEN timezone('utc'::text, now()) >= fl.unlock_at AND fl.opened_at IS NOT NULL THEN 'opened'
            WHEN timezone('utc'::text, now()) >= fl.unlock_at THEN 'ready'
            ELSE 'locked'
        END AS status,
        fl.opened_at,
        fl.reminder_enabled,
        fl.created_at,
        fl.updated_at,
        (timezone('utc'::text, now()) >= fl.unlock_at) AS is_unlocked
    FROM public.future_letters fl
    WHERE fl.user_id = p_user_id
    ORDER BY fl.unlock_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- STORAGE BUCKET CONFIGURATION (Run in Supabase SQL Editor)
-- ====================================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('memories-media', 'memories-media', false)
-- ON CONFLICT (id) DO NOTHING;

-- POLICY: "Users can upload their own media"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'memories-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- POLICY: "Users can read their own media"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'memories-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- POLICY: "Users can delete their own media"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (bucket_id = 'memories-media' AND (storage.foldername(name))[1] = auth.uid()::text);
