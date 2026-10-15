# THE AFTERSTORY — Supabase Setup & Architecture Guide

## Overview
This directory contains the database schema, security policies, storage configuration, and seed data for **THE AFTERSTORY** trip memory vault.

## How to Apply the Database Schema

### Method 1: Using the Supabase Dashboard SQL Editor (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left navigation, click **SQL Editor**.
4. Click **New Query**.
5. Copy the contents of [`migrations/20261015000000_create_memory_vault_schema.sql`](./migrations/20261015000000_create_memory_vault_schema.sql) and paste into the editor.
6. Click **Run** (or `Ctrl+Enter` / `Cmd+Enter`).
7. You should see `Success. No rows returned`. All tables, indexes, RLS policies, storage bucket `gallery`, and initial itinerary records are now created!

### Method 2: Using the Supabase CLI
```bash
supabase link --project-ref your-project-ref
supabase db push
```

---

## Setting Up an Admin User

To access the protected CMS dashboard at `/admin`:

1. In your Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **Add User** → **Create User**.
3. Enter your admin email and a secure password.
4. Check **Auto Confirm User** (so you can sign in immediately without an email confirmation roundtrip).
5. Open the website, navigate to `/admin/login`, and sign in with the email and password you just created.

---

## Storage Bucket Configuration

The migration automatically creates and configures the `gallery` bucket with:
- **Public read access** (for displaying trip photographs to visitors).
- **Authenticated admin write access** (only logged-in admins can upload, replace, or delete files).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Max upload size: 8 MB.

---

## Row Level Security (RLS) Summary

| Table | Anonymous / Public Visitor | Authenticated Admin |
| :--- | :--- | :--- |
| `site_settings` | SELECT (Read-only) | SELECT, INSERT, UPDATE, DELETE |
| `destinations` | SELECT (Published only) | Full Access (Drafts & Published) |
| `journey_days` | SELECT (Published only) | Full Access |
| `activities` | SELECT (Read-only) | Full Access |
| `media` | SELECT (Published only) | Full Access |
| `people` | SELECT (Published only) | Full Access |
| `memories` | SELECT (Approved only) & INSERT (Pending only) | Full Access (Moderate & Delete) |
| `guestbook_entries` | SELECT (Approved only) & INSERT | Full Access |
| `storage.objects` (`gallery`) | SELECT (Public URL read) | INSERT, UPDATE, DELETE |
