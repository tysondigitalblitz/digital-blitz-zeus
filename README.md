# Zeus Pixel Tracker

A lightweight, self-hosted tracking pixel built with Next.js and Supabase.  
Tracks Google Ads click IDs (GCLID, WBRAID, GBRAID) and UTM parameters for offline conversion tracking.
# Zeus Pixel Tracker

A lightweight, self-hosted tracking pixel built with Next.js and Supabase.  
Tracks Google Ads click IDs (GCLID, WBRAID, GBRAID) and UTM parameters for offline conversion tracking.

---

## 🧠 What This Does

This system captures:

- `gclid`, `wbraid`, `gbraid` from ad clicks
- UTM parameters (source, medium, campaign)
- Timestamp, page URL, IP, User-Agent
- Custom `client_id` to track multiple client sites

All data is stored in Supabase in a table called `click_events`.

---

## ⚙️ Tech Stack

- **Next.js (App Router)** — frontend + API routes
- **Supabase** — data storage
- **Vercel** — deployment
- **Vanilla JS pixel** — added to any client website

---

## 🚀 How to Use the Tracking Pixel (Client-Side)

### 1. Add This to the Website

Paste this anywhere in the client’s site HTML (usually in `<head>` or just before `</body>`):

```html
<script
  src="https://zeus-orpin-chi.vercel.app/pixel.js"
  data-client="YOUR_CLIENT_ID"
  defer
></script>
```

Replace `YOUR_CLIENT_ID` with a unique slug for the client (e.g. "airco-plumbing")

### 🔍 When It Tracks

The pixel will only log data if:

- The page contains a `gclid`, `wbraid`, or `gbraid` in the URL
- OR `utm_source=google` is present

All other traffic is ignored (to avoid noise and overlogging).

### 🧪 How to Test It

Visit the deployed app:

```
https://zeus-orpin-chi.vercel.app
```

Then visit a test URL on any site with:

```
?gclid=test123&utm_source=google&utm_campaign=test
```

Go back to the dashboard and see the row appear.

---

## 🧠 What This Does

This system captures:

- `gclid`, `wbraid`, `gbraid` from ad clicks
- UTM parameters (source, medium, campaign)
- Timestamp, page URL, IP, User-Agent
- Custom `client_id` to track multiple client sites

All data is stored in Supabase in a table called `click_events`.

---

## ⚙️ Tech Stack

- **Next.js (App Router)** — frontend + API routes
- **Supabase** — data storage
- **Vercel** — deployment
- **Vanilla JS pixel** — added to any client website

---

## 🚀 How to Use the Tracking Pixel (Client-Side)

### 1. Add This to the Website

Paste this anywhere in the client’s site HTML (usually in `<head>` or just before `</body>`):

```html
<script
  src="https://zeus-orpin-chi.vercel.app/pixel.js"
  data-client="YOUR_CLIENT_ID"
  defer
></script>
Replace YOUR_CLIENT_ID with a unique slug for the client (e.g. "airco-plumbing")

🔍 When It Tracks
The pixel will only log data if:

The page contains a gclid, wbraid, or gbraid in the URL
OR

utm_source=google is present

All other traffic is ignored (to avoid noise and overlogging).

🧪 How to Test It
Visit the deployed app:

arduino
Copy
Edit
https://zeus-orpin-chi.vercel.app
Then visit a test URL on any site with:

bash
Copy
Edit
?gclid=test123&utm_source=google&utm_campaign=test
Go back to the dashboard and see the row appear.

🛠️ Local Development Setup
Clone the repo

bash
Copy
Edit
git clone https://github.com/your-org/zeus-pixel.git
cd zeus-pixel
Install dependencies

bash
Copy
Edit
npm install
Set environment variables in .env.local:

env
Copy
Edit
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
Start the dev server

bash
Copy
Edit
npm run dev
Visit http://localhost:3000 to view the dashboard

🧱 Supabase Schema
Create the click_events table in Supabase:

sql
Copy
Edit
create extension if not exists "pgcrypto";

create table public.click_events (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  gclid text,
  wbraid text,
  gbraid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  page_url text,
  ip_address text,
  user_agent text,
  timestamp timestamptz default now()
);
Make sure Row-Level Security (RLS) is disabled or a proper service role key is used in your API route.

🌐 Deployment (Vercel)
Push to GitHub

Connect the repo to Vercel

Set environment variables in Vercel:

SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

Once deployed, the pixel is live at:

arduino
Copy
Edit
https://your-vercel-url.vercel.app/pixel.js
✅ To Do (Optional Enhancements)
Add a CLI or UI for uploading offline conversions to Google Ads

Add cookie-based session tracking

Build client dashboards (filter by client_id)

Secure pixel endpoint (HMAC or token validation)

📬 Questions?
Reach out to the maintainer or open an issue.