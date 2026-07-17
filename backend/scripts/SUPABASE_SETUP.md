# Supabase PostgreSQL Setup Guide

## Prerequisites

- A Supabase project (create one at https://supabase.com)
- This guide assumes you have the project's API settings accessible

## Step 1: Run the Migration SQL

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/`[YOUR_PROJECT_REF]`/sql/new
2. Copy the contents of `scripts/init_supabase.sql`
3. Paste into the SQL Editor and click **Run**
4. Verify all 8 tables are created in the Table Editor

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and update:

```ini
# Database connection string (from Project Settings → Database → Connection string)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Supabase project settings (from Project Settings → API)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-database-password
```

## Step 3: Start the Backend

The backend detects the database type from `DATABASE_URL` automatically.

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Key Changes

| What | Change |
|------|--------|
| Database | SQLite → PostgreSQL via Supabase |
| SQLAlchemy | `String()` without length auto-maps to `TEXT` on PG (models unchanged) |
| RLS | All user-scoped tables have RLS policies |
| Passwords | Use `SUPABASE_DB_PASSWORD` from project settings |
| Rollback | Set `DATABASE_URL=sqlite:///./data/mentor_ai_studio.db` to revert |

## What Stayed the Same

- All API endpoints, contracts, responses
- All SQLAlchemy models, repositories, services
- All JWT auth, OAuth, session logic
- All AI generation, streaming, caching
- All frontend code
- The SQL sandbox (`sqlite3 :memory:` in the compiler is untouched)

## Troubleshooting

- **`FATAL: password authentication failed`** — Double-check `SUPABASE_DB_PASSWORD` contains the correct database password (not the anon key)
- **`relation "users" does not exist`** — The migration SQL hasn't been run yet. Paste `init_supabase.sql` into the Supabase SQL Editor
- **`VARCHAR requires length`** — This should be handled by the `@compiles(String, 'postgresql')` override in `db/session.py`
