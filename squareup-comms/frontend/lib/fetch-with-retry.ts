/**
 * Fetch wrapper with retry logic for Render free-tier cold starts.
 *
 * When Render's service is sleeping, the first request may get a 503
 * from the proxy WITHOUT CORS headers, causing browsers to throw
 * a generic TypeError("Failed to fetch"). Retrying after longer delays
 * gives the service time to wake up (cold starts can take 60-90s).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 10, baseDelay = 5000 } = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      // 503 from Render proxy during cold start — retry
      if (res.status === 503 && attempt < retries) {
        await delay(baseDelay * Math.min(attempt + 1, 4));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await delay(baseDelay * Math.min(attempt + 1, 4));
        continue;
      }
    }
  }

  throw lastError;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Tracks whether the backend has responded at least once */
let _backendReady = false;
/** Singleton promise so concurrent callers share one warmup */
let _warmupPromise: Promise<void> | null = null;

/** Returns true once the backend has responded successfully at least once */
export function isBackendReady(): boolean {
  return _backendReady;
}

/**
 * Wake up the Render backend by hitting the health endpoint with retries.
 * Uses a singleton so multiple pages calling this share one warmup attempt.
 * Retries for up to ~2 minutes to survive Render cold starts (60-90s).
 */
export function warmUpBackend(): Promise<void> {
  if (_backendReady) return Promise.resolve();
  if (_warmupPromise) return _warmupPromise;

  _warmupPromise = (async () => {
    try {
      await fetchWithRetry(`${API_URL}/health`, { method: "GET" }, {
        retries: 15,
        baseDelay: 5000,
      });
      _backendReady = true;
    } catch {
      // Exhausted all retries — service may be down
    } finally {
      _warmupPromise = null;
    }
  })();

  return _warmupPromise;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
