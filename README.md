# The Memory Vault — October 2026

A cinematic scrapbook-style React + Vite + Tailwind CSS starter for the Varanasi → Shimla → Chandigarh journey (15–20 October 2026).

## What's implemented

- Responsive, cinematic landing page and trip countdown (15 Oct 2026, 2:00 PM IST)
- Six itinerary chapters based on the supplied printed itinerary
- Clickable route timeline and Google Maps route link
- Photo archive with search, image lightbox, and local image upload
- Add-people cards
- Memory wall / guestbook
- Export and restore JSON backup
- Mobile navigation, subtle interaction states, accessible labels and keyboard focus styles
- Tailwind CSS configured; handcrafted CSS handles the visual design

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL Vite prints. For a production build:

```bash
npm run build
npm run preview
```

## Important: local demo vs shared vault

This version is a working **front-end prototype**. Notes, people and photos are saved in the current browser's `localStorage`; uploaded photos are stored as browser data URLs. They do **not** automatically sync to other people's devices, and browser storage can be cleared or run out of space. The upload limit is 1.2 MB per image to reduce local-storage failures.

Deploying this prototype to a public URL means anyone with the URL can view the page, but it does **not** create shared cloud storage. Do not enter sensitive/private messages or upload other people's photos without their permission. A URL that can be forwarded is not a strong privacy boundary.

## To make it a real shared vault

Use Supabase (or an equivalent backend) before inviting the group:

1. Create a Supabase project.
2. Create `memories` table: `id uuid primary key default gen_random_uuid()`, `name text not null`, `message text not null`, `mood text`, `created_at timestamptz default now()`.
3. Create `people` table: `id uuid primary key default gen_random_uuid()`, `name text not null`, `note text`, `created_at timestamptz default now()`.
4. Create a private Storage bucket named `trip-photos` for image uploads.
5. Add Supabase Auth with invite-only access if the vault is intended for the trip group. For an anyone-with-the-link mode, a public write/read policy can be spammed by strangers and should not be used for personal photos or private messages. Prefer a simple access code checked by a server/Edge Function, or invite-only authentication.
6. Add `@supabase/supabase-js`, put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, and replace the localStorage helpers with Supabase reads/writes and Storage upload URLs. Never put a service-role key in frontend code.
7. Configure Row Level Security policies for the intended access model; test read, write, edit, and delete permissions before publishing.

## Publishing

The static front end can be published to Vercel, Netlify, or Cloudflare Pages. Build command: `npm run build`; output directory: `dist`. If deploying to a public domain, add a short privacy notice and use only photos that everyone is comfortable sharing.

## Itinerary notes

The supplied itinerary lists:
- 15 Oct: depart Varanasi by bus for Prayagraj Sangam railway station; overnight train.
- 16 Oct: arrive Chandigarh, continue to Shimla; Ridge and Mall Road.
- 17 Oct: Kufri, Apple Garden, short trek, Sankat Mochan Hanuman Temple.
- 18 Oct: Shimla–Kalka toy train, Pinjore Garden, Chandigarh.
- 19 Oct: Rock Garden, Rose Garden, shopping sectors, Sukhna Lake; overnight return train.
- 20 Oct: arrive Varanasi around 2:05 PM.

Some timings/train details in the photograph are hard to read. Verify transport details with the organizer before relying on this as a live itinerary.
