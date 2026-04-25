# Deployment Guide

## Recommended Setup

Use this flow unless you specifically want to run your own Node.js server:

1. Push this project to GitHub.
2. Import the GitHub repository into Vercel.
3. Add your production environment variables in Vercel before the first deployment.
4. Point your domain from HostAtom DNS to Vercel.

This is the safest path for this app because it uses:

- Next.js server rendering and route handlers
- Prisma
- Runtime environment variables

## Required Environment Variables

Add these in Vercel for `Production` and `Preview`:

- `DATABASE_URL`
- `DIRECT_URL`

Optional:

- `DEEPGRAM_API_KEY`
- `OPENAI_API_KEY` or `CHATGPT_API_KEY`
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`
- `GEMINI_API_KEY`
- `DEMO_USER_ID`

## GitHub Setup

Create a dedicated repository for this app folder only. Do not push from a parent directory that contains unrelated files.

Suggested commands:

```bash
git init
git add .
git commit -m "Prepare project for deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Vercel Setup

1. In Vercel, choose `Add New Project`.
2. Import the GitHub repository for this app.
3. Confirm the framework is detected as `Next.js`.
4. Add the environment variables listed above.
5. Deploy.

Notes:

- The app requires Node.js 20.9+.
- `npm run build` is the production build command.
- `npm start` starts the production server if you self-host outside Vercel.

## HostAtom Domain Setup

If your domain is managed in HostAtom, keep the app on Vercel and update DNS in HostAtom:

1. Add the domain in Vercel.
2. Copy the DNS records Vercel gives you.
3. Create the matching records in HostAtom DNS.
4. Wait for DNS propagation and re-check in Vercel.

This lets you keep your existing domain/account at HostAtom while using Vercel for the actual Next.js hosting.

## Running the App on HostAtom Instead

Only use this path if your HostAtom plan supports a real Node.js or Docker deployment. A plain shared hosting file upload is not enough for this app.

Minimum requirements:

- Node.js 20.9+
- Persistent environment variables
- Ability to run `npm ci`, `npm run build`, and `npm start`
- Reverse proxy support if you want a clean public domain setup

Basic self-host workflow:

```bash
npm ci
npm run build
PORT=3000 npm start
```

Then place a reverse proxy such as Nginx in front of the app server.
