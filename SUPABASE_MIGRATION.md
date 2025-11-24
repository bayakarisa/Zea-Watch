# Supabase Migration Guide

## Overview

This project uses **Supabase** as the database backend with **custom JWT authentication** (not Supabase Auth). This gives you full control over authentication while leveraging Supabase's managed PostgreSQL database.

## Setup Steps

### 1. Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in project details and wait for project creation

### 2. Get API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → Use as `SUPABASE_URL`
   - **Service Role Key** → Use as `SUPABASE_KEY` (keep this secret!)

### 3. Run Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the entire contents of `database/schema_supabase.sql`
3. Paste and click **Run**
4. Verify all tables are created:
   - `users`
   - `email_verification_tokens`
   - `password_reset_tokens`
   - `subscriptions`
   - `predictions`
   - `audit_logs`
   - `shared_analyses`
   - `disease_trends`

### 4. Configure Environment Variables

**Backend `.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
JWT_SECRET_KEY=your-jwt-secret-key
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your_email_api_key
EMAIL_FROM=noreply@zeawatch.com
APP_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_key
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  # For frontend Supabase client if needed
```

### 5. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

## Key Differences from Direct PostgreSQL

1. **No psycopg2 needed** - Using Supabase Python client
2. **Service Role Key** - Required for backend operations (bypasses RLS)
3. **RLS Policies** - Still enforced, but service role key can bypass
4. **Managed Database** - No need to manage PostgreSQL server

## Authentication Flow

- **Custom JWT** - We generate our own JWT tokens (not Supabase Auth)
- **Password Hashing** - Using bcrypt (stored in `users.password_hash`)
- **Email Verification** - Custom tokens stored in `email_verification_tokens`
- **User Management** - All handled in our `users` table

## Row Level Security (RLS)

RLS is enabled on all tables. The backend uses the **service role key** which bypasses RLS for admin operations. For user-facing operations, you can:

1. Use Supabase client with user's JWT token (if integrating Supabase Auth)
2. Or continue using custom JWT and service role key (current approach)

## Troubleshooting

### "Module not found: Can't resolve 'react-i18next'"

Run:
```bash
cd frontend
npm install
```

### "SUPABASE_URL and SUPABASE_KEY must be set"

Make sure your backend `.env` file has:
- `SUPABASE_URL`
- `SUPABASE_KEY` (service role key, not anon key)

### Database connection errors

1. Verify Supabase project is active
2. Check API keys are correct
3. Ensure schema migration ran successfully
4. Check RLS policies if queries fail

## Next Steps

1. Run the schema migration
2. Set up environment variables
3. Test authentication endpoints
4. Deploy to production

