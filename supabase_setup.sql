-- ============================================================
-- DocsChat — Complete Supabase Setup Script
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- This drops and recreates everything cleanly.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. DROP EXISTING TABLES (clean slate)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;


-- ────────────────────────────────────────────────────────────
-- 2. CREATE TABLES
-- ────────────────────────────────────────────────────────────
CREATE TABLE chat_sessions (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    title       TEXT        NOT NULL DEFAULT 'New Chat',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id  UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL DEFAULT '',
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_chat_sessions_user_id   ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);


-- ────────────────────────────────────────────────────────────
-- 3. ENABLE ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4. GRANT TABLE PERMISSIONS TO ROLES
--    (RLS filters rows, but grants allow table access at all)
-- ────────────────────────────────────────────────────────────
GRANT ALL ON chat_sessions TO anon, authenticated, service_role;
GRANT ALL ON chat_messages TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 5. RLS POLICIES — chat_sessions
-- ────────────────────────────────────────────────────────────
CREATE POLICY "sessions: insert own"
    ON chat_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "sessions: select own"
    ON chat_sessions FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "sessions: update own"
    ON chat_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "sessions: delete own"
    ON chat_sessions FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id);


-- ────────────────────────────────────────────────────────────
-- 6. RLS POLICIES — chat_messages
-- ────────────────────────────────────────────────────────────
CREATE POLICY "messages: insert own"
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        session_id IN (
            SELECT id FROM chat_sessions
            WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "messages: select own"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM chat_sessions
            WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "messages: delete own"
    ON chat_messages FOR DELETE
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM chat_sessions
            WHERE user_id = auth.uid()::text
        )
    );


-- ────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKET — chat-media (for image uploads)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
CREATE POLICY "media: upload own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chat-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read (images are served publicly in the UI)
CREATE POLICY "media: public read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'chat-media');

-- Allow users to delete their own files
CREATE POLICY "media: delete own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chat-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );


-- ────────────────────────────────────────────────────────────
-- 8. VERIFY — run these SELECTs to confirm everything is set up
-- ────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('chat_sessions', 'chat_messages')
ORDER BY tablename, cmd;
