-- =============================================================================
-- Supabase PostgreSQL Migration for Mentor AI Studio
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =============================================================================
-- ENUM types
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE history_entry_type AS ENUM ('question', 'explanation', 'code', 'concept');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    full_name       TEXT,
    username        TEXT UNIQUE,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT,
    avatar_url      TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    theme_preference TEXT DEFAULT 'system',
    preferred_language TEXT DEFAULT 'en',
    timezone        TEXT DEFAULT 'UTC',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_id ON users (id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- 2. auth_sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address      TEXT,
    user_agent      TEXT,
    device_info     TEXT,
    location        TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_active_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_id ON auth_sessions (id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);

-- 3. refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    jti             TEXT UNIQUE NOT NULL,
    session_id      TEXT,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_id ON refresh_tokens (id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens (jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- 4. notes
CREATE TABLE IF NOT EXISTS notes (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    subject         VARCHAR(100),
    is_pinned       BOOLEAN DEFAULT FALSE NOT NULL,
    color           VARCHAR(7) DEFAULT '#1e293b',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_id ON notes (id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_title ON notes (title);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes (subject);

-- 5. history
CREATE TABLE IF NOT EXISTS history (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    entry_type      history_entry_type NOT NULL DEFAULT 'question',
    subject         VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_id ON history (id);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON history (user_id);
CREATE INDEX IF NOT EXISTS idx_history_title ON history (title);
CREATE INDEX IF NOT EXISTS idx_history_subject ON history (subject);

-- 6. bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    url             TEXT,
    content         TEXT,
    subject         VARCHAR(100),
    tags            VARCHAR(500),
    is_favorite     BOOLEAN DEFAULT FALSE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_id ON bookmarks (id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_subject ON bookmarks (subject);

-- 7. api_keys
CREATE TABLE IF NOT EXISTS api_keys (
    id                  SERIAL PRIMARY KEY,
    user_id             TEXT REFERENCES users(id) ON DELETE CASCADE,
    key_value           TEXT NOT NULL,
    masked_key          VARCHAR(100) NOT NULL,
    label               VARCHAR(200),
    status              VARCHAR(20) NOT NULL DEFAULT 'healthy',
    provider            VARCHAR(50) NOT NULL DEFAULT 'groq',
    is_enabled          BOOLEAN DEFAULT TRUE NOT NULL,
    last_used_at        TIMESTAMP WITH TIME ZONE,
    last_error_at       TIMESTAMP WITH TIME ZONE,
    last_error_message  TEXT,
    total_requests      INTEGER DEFAULT 0 NOT NULL,
    total_errors        INTEGER DEFAULT 0 NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_id ON api_keys (id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys (provider);

-- 8. settings
CREATE TABLE IF NOT EXISTS settings (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key             VARCHAR(100) NOT NULL,
    value           TEXT,
    category        VARCHAR(100) DEFAULT 'general',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_setting_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_id ON settings (id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings (user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings (key);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (id = current_setting('app.current_user_id', TRUE)::text OR current_setting('app.current_user_id', TRUE) IS NULL);
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (id = current_setting('app.current_user_id', TRUE)::text);

-- auth_sessions
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own auth_sessions" ON auth_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- refresh_tokens
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own refresh_tokens" ON refresh_tokens
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own notes" ON notes
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- history
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own history" ON history
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own bookmarks" ON bookmarks
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own api_keys" ON api_keys
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text OR user_id IS NULL);
CREATE POLICY "Service can see global keys" ON api_keys
    FOR SELECT USING (user_id IS NULL);

-- settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own settings" ON settings
    FOR ALL USING (user_id = current_setting('app.current_user_id', TRUE)::text);

-- =============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_history_updated_at BEFORE UPDATE ON history
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
