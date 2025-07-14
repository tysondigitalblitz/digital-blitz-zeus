# Zeus Pixel Tracker

A lightweight, self-hosted tracking pixel built with **Next.js** and **Supabase**.  
Tracks Google Ads click IDs (GCLID, WBRAID, GBRAID) and UTM parameters for offline conversion tracking.

---

## Features

- Captures `gclid`, `wbraid`, `gbraid` from ad clicks
- Logs UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`)
- Records timestamp, page URL, IP address, user agent
- Stores all data in Supabase (`click_events` table)
- Filters out irrelevant traffic (non-Google Ads clicks)
- Supports multiple clients via `data-client="..."`

---

## Embed the Pixel on Client Websites

Add the following script tag to the client’s website (preferably in the `<head>` or before `</body>`):

```html
<script
  src="https://zeus-orpin-chi.vercel.app/pixel.js"
  data-client="YOUR_CLIENT_ID"
  defer
></script>
````

Replace `YOUR_CLIENT_ID` with a unique name for each client, like `airco-plumbing` or `dentist-nyc`.

---

## When It Tracks

The pixel will only track and log a visit if:

* `utm_source=google` is present in the URL **OR**
* A click ID is present: `gclid`, `wbraid`, or `gbraid`

All other traffic is ignored by default to prevent logging irrelevant visits.

---

## How to Test

1. Add the pixel to any site (or localhost).
2. Visit a URL like:

```
https://example.com/?gclid=test123&utm_source=google&utm_campaign=test
```

3. Visit your dashboard to confirm:

```
https://zeus-orpin-chi.vercel.app
```

---

## Local Development Setup

1. Clone the repo:

```bash
git clone https://github.com/your-org/zeus-pixel.git
cd zeus-pixel
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file and add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
```

4. Run the app:

```bash
npm run dev
```

5. Open the dashboard at:

```
http://localhost:3000
```

---

## Supabase Table Schema

Run this SQL in Supabase SQL Editor to create the `click_events` table:

```sql
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
```

Make sure **Row-Level Security (RLS)** is disabled **or** that your app uses a Supabase **service role key** for writes.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Connect the repo to [vercel.com](https://vercel.com).
3. Set environment variables:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Once deployed, your pixel will be live at:

```
https://your-vercel-project.vercel.app/pixel.js
```

---

## Optional Improvements

* Add cookie-based tracking for delayed conversions
* Build a lead → conversion matching system
* Auto-upload offline conversions to Google Ads API
* Add spam protection (e.g. HMAC token validation)
* Build client-specific dashboards and filters

---

## License

MIT

---

## Contact

For questions or contributions, reach out to the maintainer or open an issue.