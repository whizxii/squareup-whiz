# Firebase Setup

SquareUp Comms uses Firebase for authentication (Google Sign-In) and optionally for file storage.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `squareup-comms`) → Continue
3. Disable Google Analytics (optional) → **Create project**

## 2. Enable Authentication

1. In your project, go to **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Enable **Google** provider
4. Set a support email → **Save**

## 3. Create a Web App

1. Go to **Project settings** (gear icon) → **General** tab
2. Under **Your apps**, click the web icon (`</>`)
3. Register the app (e.g. `squareup-comms-web`)
4. Copy the `firebaseConfig` object — you'll need these values for the frontend `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 4. Generate a Service Account Key (Backend)

1. Go to **Project settings → Service accounts**
2. Click **Generate new private key** → **Generate key**
3. Save the downloaded JSON file as `firebase-credentials.json` in the `backend/` directory

Then set the backend env var:

```env
# Option A: paste the entire JSON as a single line
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'

# Option B: just point to the file (default)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

## 5. (Optional) Enable Cloud Storage

If you want Firebase-hosted file storage instead of local disk:

1. Go to **Build → Storage → Get started**
2. Choose a location, click **Done**
3. Copy the bucket name (e.g. `squareup-comms.appspot.com`)
4. Set in backend `.env`:

```env
FIREBASE_STORAGE_BUCKET=squareup-comms.appspot.com
```

## 6. Disable Dev Auth

Once Firebase is configured, disable the dev-mode fallback:

```env
ENABLE_DEV_AUTH=false
```

This ensures all requests require a valid Firebase ID token.
