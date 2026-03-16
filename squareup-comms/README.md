# SquareUp Comms

Team communication platform with chat, CRM, virtual office, AI agents, drive, and voice/video calls.

## Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or pnpm

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env — at minimum set GROQ_API_KEY for AI agents

# Initialize database & seed
python -m scripts.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Dev mode auto-logs you in as `dev-user-001`.

### 3. Docker (PostgreSQL)

```bash
docker-compose up
```

Runs PostgreSQL + backend. Frontend still runs locally via `npm run dev`.

## Environment Variables

See `backend/.env.example` for all available settings. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | For AI agents | Free at https://console.groq.com |
| `LIVEKIT_API_KEY` | For calls | Free at https://cloud.livekit.io |
| `LIVEKIT_API_SECRET` | For calls | Same as above |
| `GOOGLE_CLIENT_ID` | For Calendar/Gmail | Google Cloud Console OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | For Calendar/Gmail | Same as above |
| `FIREBASE_CREDENTIALS_JSON` | For prod auth | Firebase Console → Service Account |

## Architecture

```
frontend/          Next.js 16 + React 19 + TypeScript
backend/           FastAPI + SQLModel + Alembic
  app/
    api/           REST endpoints
    models/        SQLModel table definitions
    services/      Business logic
    websocket/     Real-time chat & office events
    core/          Config, auth, database, middleware
  migrations/      Alembic migration scripts
  scripts/         Seed data, utilities
```

## Features

- **Chat** — Channels, threads, reactions, file attachments, @mentions
- **CRM** — Contacts, companies, deals, pipelines, email sequences, tags
- **Virtual Office** — 2D pixel-art canvas with proximity chat
- **AI Agents** — Research, writing, code review bots (powered by Groq/Llama)
- **Drive** — File upload, preview, and sharing
- **Calls** — Voice/video via LiveKit
- **Calendar** — Google Calendar integration
