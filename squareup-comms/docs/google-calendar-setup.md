# Google Calendar & Gmail Setup

SquareUp Comms can integrate with Google Calendar for event sync and Gmail for CRM email tracking.

## 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services → Library**
4. Enable these APIs:
   - **Google Calendar API**
   - **Gmail API**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → OAuth 2.0 Client ID**
7. Application type: **Web application**
8. Add authorized redirect URI: `http://localhost:8000/api/calendar/callback`
9. Copy the **Client ID** and **Client Secret**

## 2. Configure the Backend

Add to your backend `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
```

## 3. Enable Gmail Sync (Optional)

To enable background Gmail sync for CRM email tracking:

```env
GMAIL_SYNC_ENABLED=true
GMAIL_SYNC_INTERVAL_SECONDS=300
```

## 4. Generate an Encryption Key

OAuth refresh tokens are encrypted at rest. Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Add to `.env`:

```env
ENCRYPTION_KEY=your-generated-fernet-key
```

## 5. OAuth Flow

1. User clicks **Connect Google Calendar** in Settings
2. Frontend redirects to `/api/calendar/auth`
3. Backend redirects to Google's OAuth consent screen
4. User grants permission → Google redirects back to the callback URI
5. Backend stores the encrypted refresh token in the database
6. Calendar events and Gmail messages sync automatically

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "redirect_uri_mismatch" | Ensure the redirect URI in Google Console matches `GOOGLE_REDIRECT_URI` exactly |
| "Access blocked: app not verified" | Click **Advanced → Go to app** (dev mode only) or submit for verification |
| No events showing | Check that Google Calendar API is enabled in the Cloud Console |
| Gmail sync not working | Verify `GMAIL_SYNC_ENABLED=true` and that Gmail API is enabled |
