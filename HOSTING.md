# Hosting MeetUp AI (share with others on a domain)

You can host this app so anyone can use it at a URL (e.g. `https://yourapp.com`) instead of only on your machine. Below are options in the **free to ~$10/month** range.

## Option 1: Vercel (recommended, free tier)

- **Cost:** Free for personal/hobby use. Paid only if you need more bandwidth or team features.
- **Custom domain:** Free (you bring your own domain or use `*.vercel.app`).
- **Best for:** Next.js apps; one-click deploy from GitHub.

**Steps:**

1. Push your code to **GitHub**.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. Set **Environment Variables** in the project:
   - `DATABASE_URL` (Supabase/Neon connection string; use **Session/direct** for Supabase)
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` = `https://your-project.vercel.app` (or your custom domain after you add it)
   - `ANTHROPIC_API_KEY` (optional, for AI recommendations)
4. Deploy. The app will be at `https://your-project.vercel.app`.
5. **Custom domain:** Project → **Settings** → **Domains** → add your domain and follow DNS instructions.

---

## Option 2: Railway (~$5/month)

- **Cost:** About $5/month after free trial credits.
- **Custom domain:** Free (e.g. `yourapp.up.railway.app` or your own domain).

**Steps:**

1. Push code to **GitHub**.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → select repo.
3. Add **PostgreSQL** in the same project (or keep using Supabase/Neon and only set `DATABASE_URL`).
4. In **Variables**, set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (e.g. `https://your-app.up.railway.app`), and optionally `ANTHROPIC_API_KEY`.
5. Under **Settings** → **Networking** → **Public Networking**, generate a domain. Optionally add your own domain.

---

## Option 3: Render (~$7/month for always-on)

- **Cost:** Free tier can spin down when idle; **Starter** (~$7/mo) keeps the app always on.
- **Custom domain:** Free.

**Steps:**

1. Push code to **GitHub**.
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect repo.
3. **Build:** `npm install && npm run build`. **Start:** `npm start`.
4. Add **Environment Variables:** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your Render URL), and optionally `ANTHROPIC_API_KEY`.
5. Deploy. Add a custom domain under **Settings** → **Custom Domain** if you have one.

---

## Database when hosted

- Keep using **Supabase** or **Neon** (both have free tiers). Use the **direct/Session** connection string (e.g. Supabase: `db.xxx.supabase.co:5432`) in `DATABASE_URL`; avoid the pooler if you had “Tenant or user not found” before.
- Do **not** commit `.env.local`. Set the same variables in your host’s dashboard (Vercel/Railway/Render).

## Custom domain (~$10–15/year)

- Buy a domain from **Namecheap**, **Google Domains**, **Cloudflare**, or **Porkbun**.
- In your host (Vercel/Railway/Render), add the domain and set the DNS records they show (usually one A/CNAME). Then set `NEXTAUTH_URL` to `https://yourdomain.com`.

---

**Summary:** For $0, use **Vercel** + Supabase/Neon + a free `*.vercel.app` URL. For a few dollars a month and a custom URL, use **Railway** or **Render** and point a cheap domain to it.
