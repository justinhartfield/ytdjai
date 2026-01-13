# Supabase Setup Guide

This guide will help you set up cloud storage for your DJ sets using Supabase.

## Prerequisites

- Supabase project URL: `https://znddztuyuymrvobmnhjt.supabase.co`
- Environment variables are already configured in `.env.local`

## Step 1: Run the Database Migration

1. Go to your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. Navigate to your project: `znddztuyuymrvobmnhjt`

3. Click on **SQL Editor** in the left sidebar

4. Click **New Query**

5. Copy the contents of `supabase-schema.sql` and paste it into the SQL editor

6. Click **Run** to execute the migration

This will create:
- A `dj_sets` table to store your DJ sets
- Indexes for fast queries
- Row Level Security policies
- Automatic timestamp updates

## Step 2: Verify the Setup

After running the migration, you can verify it was successful:

1. Go to **Table Editor** in the left sidebar
2. You should see a `dj_sets` table with the following columns:
   - `id` (uuid, primary key)
   - `user_email` (text)
   - `set_id` (text)
   - `name` (text)
   - `data` (jsonb)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Step 3: Start Using Cloud Sync

Once the database is set up, you can:

### Save a Set
1. Create or load a DJ set with tracks
2. Click the **Save** button in the header
3. Enter a name for your set
4. Click **Save to Cloud**

### Browse Saved Sets
1. Click the **folder icon** or the current set name in the header
2. You'll see a list of all your saved sets with:
   - Set name
   - Number of tracks
   - Arc template used
   - Last updated time
   - Export status (if exported to YouTube)

### Load a Set
1. Open the Browse Sets modal
2. Click **Load** on any saved set
3. The set will be loaded as your current set

### Delete a Set
1. Open the Browse Sets modal
2. Click the **trash icon** next to any set
3. Confirm deletion

## Features

- **Cross-Device Sync**: Access your sets from any device
- **Automatic Backups**: Your sets are stored in the cloud
- **Fast Loading**: Sets load instantly from Supabase
- **Secure**: Row Level Security ensures only you can access your sets
- **Version Tracking**: Each save updates the `updated_at` timestamp

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in with Google OAuth
- Check that your session is active

### "Failed to save set" Error
- Verify the database migration was run successfully
- Check the browser console for detailed error messages
- Ensure your Supabase credentials in `.env.local` are correct

### Sets Not Appearing
- Click the **Refresh** button in the Browse Sets modal
- Check that you're logged in with the same email you used to save the sets

## Technical Details

- **Authentication**: Uses NextAuth with Google OAuth
- **Storage**: PostgreSQL via Supabase
- **API Endpoints**:
  - `POST /api/sets/save` - Save a set
  - `GET /api/sets/list` - List all sets
  - `GET /api/sets/[id]` - Load a specific set
  - `DELETE /api/sets/[id]` - Delete a set
- **State Management**: Zustand store with cloud sync methods
