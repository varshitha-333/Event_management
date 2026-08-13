# Vercel Deployment Guide with Tectonic LaTeX Compiler

This guide explains how to deploy the Event Management System to Vercel with Tectonic LaTeX compilation support.

## Prerequisites

- GitHub account
- Vercel account
- PostgreSQL database (Vercel Postgres or external)

## Step 1: Prepare Environment Variables

Create these environment variables in your Vercel project:

### Database
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### AI Services
```
OPENROUTER_API_KEY=your_openrouter_key
NVIDIA_API_KEY=your_nvidia_key
```

### Application
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
JWT_SECRET=your_random_secret_string_here
```

### Tectonic (Optional - for local development)
```
TECTONIC_PATH=D:\event_folde\Event_management\tectonic.exe
```

## Step 2: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. Go to Vercel Dashboard → Storage → Create Database
2. Select Postgres
3. Copy the `DATABASE_URL` from the dashboard
4. Add to environment variables

### Option B: External PostgreSQL

Use services like:
- Neon (https://neon.tech)
- Supabase (https://supabase.com)
- Railway (https://railway.app)

## Step 3: Run Database Migrations

Before deploying, ensure your database schema is up to date:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

## Step 4: Deploy to Vercel

### Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

### Via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:

**Build Settings:**
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables:**
Add all the variables from Step 1

6. Click "Deploy"

## Step 5: How Tectonic Works on Vercel

The system automatically handles Tectonic compilation:

### On Vercel (Linux):
- Downloads Tectonic Linux binary on first use
- Caches the binary in `/tmp/tectonic`
- Uses it for all PDF compilations

### Local Development (Windows):
- Uses local `tectonic.exe` from `TECTONIC_PATH`
- Falls back to system `tectonic` if available

### The Setup Module

`app/lib/latex/tectonic-setup.ts` handles:
- Detecting the environment (Vercel vs local)
- Downloading the appropriate Tectonic binary
- Making it executable
- Providing the correct path to compilation functions

## Step 6: Verify Deployment

After deployment:

1. Visit your Vercel URL
2. Test event creation
3. Test proposal generation (PDF)
4. Test report generation (PDF)
5. Check Vercel logs for any errors

## Troubleshooting

### Tectonic Download Fails

If Tectonic fails to download on Vercel:

1. Check Vercel logs for network errors
2. Ensure the GitHub releases URL is accessible
3. Consider using a pre-compiled binary in your repo

### PDF Generation Timeout

Increase timeout in:
- `app/api/proposal/generate/route.ts` (line 149)
- `app/api/report/[eventId]/download/route.ts` (line 109)

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check if database allows external connections
3. Ensure Prisma schema matches database

### Memory Issues

Vercel has memory limits. For large PDFs:
- Optimize LaTeX templates
- Reduce image sizes
- Consider using Vercel's paid tier for higher limits

## Alternative: Use a VPS

If Vercel doesn't work well with Tectonic:

Consider deploying to:
- **DigitalOcean** ($4-6/month)
- **AWS EC2** (Free tier available)
- **Railway** ($5/month)

These allow:
- Full system access
- Installing complete LaTeX suite
- No compilation restrictions
- Better control over resources

## Production Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Custom domain configured (optional)
- [ ] Error monitoring set up (Vercel Analytics)
- [ ] Backup strategy for database
- [ ] PDF generation tested
- [ ] AI API keys configured
- [ ] JWT secret is secure and random

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally with `vercel dev`
4. Check Tectonic binary download logs
