# TA Junction — Travelling Allowance & Contingency Calculator for Railway Employees

Built with React 19, Vite, Tailwind CSS, and Framer Motion. Formatted strictly per **7th CPC & Railway Board RBE No. 51/2024**.

---

## 🚀 How to Deploy to Vercel (Step-by-Step)

### Option 1: One-Click GitHub Integration (Recommended)
1. **Push this code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of TA Junction"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository and click **Import**.
   - Vercel will automatically detect the **Vite** framework preset:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
3. **Click Deploy**:
   Your app will be live globally at `https://<your-project>.vercel.app` in under 45 seconds!

---

### Option 2: Deploy via Vercel CLI
If you prefer deploying directly from your terminal:
```bash
# 1. Install the Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login & Deploy to production
vercel --prod
```

---

## 🗄️ Database API Configuration (When Ready)

The application currently operates with **offline / local mock persistence** (`localStorage`), allowing full usage without a live database.

When your database API (e.g. Supabase, Firebase, PostgreSQL REST, Express/Node backend, or MongoDB Atlas) is ready:

1. In the app UI, click **"Deploy to Vercel"** in the top header and switch to the **"Database API Setup"** tab to test your connection live.
2. In your Vercel Project Dashboard:
   - Go to **Settings > Environment Variables**.
   - Add:
     - `VITE_DATABASE_API_URL`: `https://your-api-endpoint.com`
     - `VITE_DATABASE_API_KEY`: `your-api-key-or-token`
3. Trigger a redeploy in Vercel to activate the live cloud database.
