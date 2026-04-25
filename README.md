# Engmatch IELTS Practice

Next.js 16 app for IELTS listening, reading, speaking, and writing practice. The app uses Prisma with PostgreSQL and has optional Deepgram and Gemini integrations for speaking features.

## Requirements

- Node.js 20.9+
- npm 10+
- PostgreSQL

## Local Development

1. Install dependencies:

```bash
npm ci
```

2. Copy `.env.example` to `.env` and fill in the PostgreSQL connection strings.
3. Start the development server:

```bash
npm run dev
```

The app runs on [http://localhost:3002](http://localhost:3002).

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection used by the running app
- `DIRECT_URL`: direct PostgreSQL connection used by Prisma schema tooling
- `DEEPGRAM_API_KEY`: optional, enables live transcription and TTS helpers
- `OPENAI_API_KEY` or `CHATGPT_API_KEY`: optional, enables ChatGPT speaking assessment fallback/provider
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`: optional, enables Claude speaking assessment fallback/provider
- `GEMINI_API_KEY`: optional, enables Gemini speaking assessment fallback/provider
- `DEMO_USER_ID`: optional, overrides the default seeded demo user id

## Production Checks

```bash
npm run deploy:check
```

## Deployment

Recommended setup:

- GitHub for source control
- Vercel for the Next.js app
- HostAtom for DNS / existing domain management

This project cannot be deployed as a static export because it uses server API routes and Prisma. If you want to run it on HostAtom itself, make sure your plan supports a persistent Node.js server or Docker.

Detailed steps are in [DEPLOYMENT.md](/Users/natchanon/Downloads/IELTS APP/engmatch1/DEPLOYMENT.md).
