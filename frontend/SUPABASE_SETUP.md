# Supabase Setup Guide for ZeaWatch

This guide will help you set up Supabase for ZeaWatch, including authentication, database, and storage.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: ZeaWatch
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
4. Click "Create new project"

## Step 2: Set Up Database Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL script
4. Verify that all tables are created:
   - `users`
   - `analyses`
   - `shared_analyses`
   - `disease_trends`

## Step 3: Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "New bucket"
3. Name: `leaf-images`
4. Make it public: **Yes** (or use signed URLs for private access)
5. Click "Create bucket"

### Set Up Storage Policies

1. Go to Storage → Policies → `leaf-images`
2. Create policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leaf-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Policy 2: Allow authenticated users to read their own images**
```sql
CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'leaf-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Policy 3: Allow public read access (if bucket is public)**
```sql
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leaf-images');
```

**Policy 4: Allow guests to upload (optional, for guest mode)**
```sql
CREATE POLICY "Guests can upload images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'leaf-images' AND (storage.foldername(name))[1] = 'guests');
```

## Step 4: Configure Authentication

1. Go to Authentication → Settings in your Supabase dashboard
2. Configure the following:

### Email Authentication
- Enable "Enable email confirmations" (recommended for production)
- Set "Site URL" to your frontend URL (e.g., `http://localhost:3000`)
- Add redirect URLs:
  - `http://localhost:3000/**` (for development)
  - `https://yourdomain.com/**` (for production)

### Email Templates (Optional)
- Customize email templates for signup, password reset, etc.

## Step 5: Get API Keys

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (this is safe to use in frontend)
   - **service_role key** (keep this secret, use only in backend)

## Step 6: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Step 7: Test the Setup

1. Start your frontend: `npm run dev`
2. Try signing up a new user
3. Check Supabase Auth → Users to see if the user was created
4. Check the `users` table to see if the profile was created (trigger should create it automatically)
5. Try uploading an image and analyzing it
6. Check the `analyses` table to see if the analysis was saved
7. Check Storage → `leaf-images` to see if the image was uploaded

## Step 8: Verify Row Level Security (RLS)

1. Go to Table Editor → `analyses`
2. Try querying the table - you should only see your own analyses
3. Sign in as a different user and verify you can't see other users' analyses

## Troubleshooting

### Users table not being created automatically
- Check if the trigger `on_auth_user_created` exists
- Verify the function `handle_new_user()` exists and is working
- Check the logs in Supabase Dashboard → Logs

### Images not uploading
- Verify the storage bucket exists and is named `leaf-images`
- Check storage policies are set correctly
- Verify the bucket is public or policies allow your user to upload

### RLS policies blocking queries
- Check that you're authenticated when querying
- Verify RLS policies are enabled on the table
- Check the policy conditions match your use case

### CORS issues
- Supabase handles CORS automatically for API requests
- If you're having issues, check your browser console for errors
- Verify your Supabase URL is correct in environment variables

## Production Considerations

1. **Enable email confirmations** in production
2. **Use environment variables** for all secrets
3. **Set up proper CORS** origins in Supabase settings
4. **Enable rate limiting** (Supabase has built-in rate limiting)
5. **Set up backups** for your database
6. **Monitor usage** and set up alerts
7. **Use signed URLs** for private images instead of public bucket
8. **Set up custom domain** for Supabase (optional)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

