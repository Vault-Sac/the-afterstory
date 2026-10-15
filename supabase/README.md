# THE AFTERSTORY — Supabase Security & Architecture Guide

## Security Architecture Overview

This project uses an **explicit, database-verified role authorization system**:
- Simply being signed in (`authenticated`) **never** grants administrator rights.
- An authenticated user must have an active record in `public.admin_users` verified via the `SECURITY DEFINER` function `public.is_admin(auth.uid())`.
- Storage uploads, updates, and deletes are restricted to verified administrators.
- Public visitors cannot read draft destinations, unpublished media, or unapproved memories.
- Public visitors can only submit memories as `pending` (with strict length limits and `approved_at = NULL`).

---

## 1. How to Apply the Database Schema

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to **SQL Editor** in the left sidebar.
3. Open [`migrations/20261015000000_create_memory_vault_schema.sql`](./migrations/20261015000000_create_memory_vault_schema.sql), copy its entire content, and paste it into the SQL Editor.
4. Click **Run**.
5. All 10 tables (including `admin_users`), `is_admin()` security function, RLS policies, and the `gallery` storage bucket will be established.

---

## 2. Registering an Administrator (Required for CMS Access)

Because administrator rights are explicitly controlled, follow these two quick steps to set up your admin account:

### Step 1: Create the User in Supabase Auth
1. In your Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **Add User** → **Create User**.
3. Enter your email (e.g. `yourname@example.com`) and a strong password.
4. Check **Auto Confirm User** and click **Create User**.

### Step 2: Grant Admin Rights in `admin_users`
In your Supabase **SQL Editor**, run either:

**Option A (Using the built-in helper function):**
```sql
SELECT public.add_admin_by_email('yourname@example.com');
```

**Option B (Direct SQL insert):**
```sql
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE lower(email) = 'yourname@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

Now, navigate to `/admin/login` on the website and sign in. The application and database will verify your record in `admin_users` and grant access to the CMS.

---

## 3. Row Level Security (RLS) Policy Matrix

| Table | Anonymous Visitor | Ordinary Authenticated User | Verified Admin (`admin_users`) |
| :--- | :--- | :--- | :--- |
| `site_settings` | SELECT | SELECT | Full Access (ALL) |
| `destinations` | SELECT (Published only) | SELECT (Published only) | Full Access (ALL + Drafts) |
| `journey_days` | SELECT (Published only) | SELECT (Published only) | Full Access (ALL + Drafts) |
| `activities` | SELECT | SELECT | Full Access (ALL) |
| `media` | SELECT (Published only) | SELECT (Published only) | Full Access (ALL + Drafts) |
| `people` | SELECT (Published only) | SELECT (Published only) | Full Access (ALL + Drafts) |
| `memories` | SELECT (Approved only) & INSERT (`pending` only) | SELECT (Approved only) & INSERT (`pending` only) | Full Access (Approve, Reject, Delete) |
| `guestbook_entries` | SELECT (Approved only) & INSERT (`pending` only) | SELECT (Approved only) & INSERT (`pending` only) | Full Access (ALL) |
| `admin_users` | No access | View own role only | View & Manage Admins |
| `storage.objects` (`gallery`) | SELECT (Public URL) | SELECT (Public URL) | Upload, Update, Delete |
