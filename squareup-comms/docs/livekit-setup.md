# LiveKit Setup

SquareUp Comms uses [LiveKit](https://livekit.io) for real-time voice and video calls between users in the virtual office.

## Option A: LiveKit Cloud (Recommended)

1. Go to [LiveKit Cloud](https://cloud.livekit.io) and create an account (free tier available)
2. Create a new project
3. From the project dashboard, copy:
   - **API Key** (starts with `API...`)
   - **API Secret**
   - **WebSocket URL** (e.g. `wss://your-project.livekit.cloud`)

4. Add to your backend `.env`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...
```

## Option B: Self-Hosted LiveKit

1. Install LiveKit server:

```bash
# macOS
brew install livekit

# Docker
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

2. The `--dev` flag auto-generates API key/secret. Check the console output for credentials.

3. Add to backend `.env`:

```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

## How It Works

1. User A clicks **Start Call** near User B in the office
2. Frontend calls `POST /api/calls/token` with the room name
3. Backend generates a LiveKit JWT using the API key/secret
4. Frontend receives the token and connects to the LiveKit room
5. Both users see video tiles and call controls (mute, camera, hang up)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "LiveKit is not configured" error | Set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in `.env` |
| Connection timeout | Verify `LIVEKIT_URL` is reachable from the backend |
| No audio/video | Check browser permissions for microphone and camera |
| Token expired | Tokens are short-lived; the frontend requests a fresh one per call |
