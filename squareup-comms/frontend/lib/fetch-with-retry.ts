/**
 * Fetch wrapper with retry logic for Render free-tier cold starts.
 *
 * When Render's service is sleeping, the first request may get a 503
 * from the proxy WITHOUT CORS headers, causing browsers to throw
 * a generic TypeError("Failed to fetch"). Retrying after longer delays
 * gives the service time to wake up (cold starts can take 30-60s).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 4, baseDelay = 3000 } = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      // 503 from Render proxy during cold start — retry
      if (res.status === 503 && attempt < retries) {
        await delay(baseDelay * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await delay(baseDelay * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Wake up the Render backend by hitting the health endpoint.
 * Call this early (e.g. on page load) so the service is warm
 * by the time the user submits a form.
 */
export async function warmUpBackend(): Promise<void> {
  try {
    await fetch(`${API_URL}/health`, { method: "GET" });
  } catch {
    // Ignore — just a best-effort wake-up ping
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
