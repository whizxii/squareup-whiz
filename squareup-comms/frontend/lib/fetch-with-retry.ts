/**
 * Fetch wrapper with retry logic for Render free-tier cold starts.
 *
 * When Render's service is sleeping, the first request may get a 503
 * from the proxy WITHOUT CORS headers, causing browsers to throw
 * a generic TypeError("Failed to fetch"). Retrying after a short
 * delay gives the service time to wake up.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 2, baseDelay = 2000 } = {}
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
