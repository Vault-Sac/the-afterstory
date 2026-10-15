# THE AFTERSTORY — The Memory Vault

> *“Some journeys end. Their stories don't.”*

A cinematic, multi-page trip journal and shared memory vault designed for the October 2026 expedition from Varanasi through Shimla and Chandigarh. Built with React, Vite, Tailwind CSS, and powered by Supabase.

---

## Architecture & Features

- **Cinematic Editorial Design**: Handcrafted deep pine & warm ivory design tokens, responsive typography, and smooth transitions.
- **Multi-Page Routing**:
  - `/`: Home page with live expedition countdown, hero narrative, and curated trip teasers.
  - `/journey`: Day-by-day expedition route visualizer and chronological chapter stories.
  - `/destinations/:slug`: Dedicated destination chapters with highlights, travel tips, and associated photography.
  - `/gallery`: Curated photo archive with location filtering, search, and image lightbox.
  - `/people`: Companion directory honoring everyone who traveled together.
  - `/memory-board`: Public digital scrapbook where companions can submit thoughts, quotes, and memories.
  - `/soundtrack`: Audio and playlist companion page.
  - `/about`: Archive purpose, privacy, and contribution guidelines.
- **Protected Admin CMS (`/admin`)**:
  - Secure dashboard for content managers.
  - Destinations editor (create, edit, reorder, update hero photography).
  - Photo archive manager with Supabase Storage uploads.
  - Memory moderation queue (approve, reject, or delete visitor submissions).
  - People & companion profiles manager.
  - Global site settings & JSON backup export.
- **Dual-Mode Backend Resilience**:
  - Full Supabase cloud connectivity when environment variables are supplied.
  - Zero-crash local demo fallback with pre-populated itinerary seed data when running offline or without credentials.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/Vault-Sac/Trip-Mmeory-Vault.git
cd trip-memory-vault

# Install dependencies
npm install

# Start local development server
npm run dev
```

---

## Supabase Setup (5 Minutes)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to your project's **SQL Editor**.
3. Open [`supabase/migrations/20261015000000_create_memory_vault_schema.sql`](./supabase/migrations/20261015000000_create_memory_vault_schema.sql), copy the entire SQL script, paste it into the SQL Editor, and click **Run**.
   - This creates all 9 tables, indexes, RLS policies, the `gallery` storage bucket, and idempotent initial trip seed data.
4. In your Supabase Dashboard, go to **Authentication** → **Users** → **Add User** to create an admin account (check "Auto Confirm User").
5. Copy your project URL and Anon/Publishable Key into `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

---

## Vercel Deployment

This project includes a production-ready `vercel.json` configured with SPA routing rewrites and security headers.

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. In the Vercel project settings under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy! All routes (`/journey`, `/admin`, `/destinations/:slug`, etc.) will route properly without 404 errors.

---

## Security Model

- **Row Level Security (RLS)** is enabled on all tables.
- Public visitors can only view published content and approved memories.
- Public visitors can submit memories and guestbook entries, but they are strictly placed into `pending` moderation status.
- Only authenticated administrators have permissions to modify destinations, upload images, approve/reject memories, or update settings.
- Private `service_role` keys are never used or bundled in client-side code.
