addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Add the 'scheduled' event listener for Cron Triggers
addEventListener('scheduled', event => {
  event.waitUntil(triggerScheduledUpdate(event));
});

/**
 * Cache duration in seconds.
 * Example: 1 hour = 3600 seconds. 24 hours = 86400 seconds.
 */
const CACHE_DURATION_SECONDS = 86400; // Cache for 24 hours, refreshed by cron

/**
 * Handles incoming HTTP requests.
 */
async function handleRequest(request) {
  const cache = caches.default;
  // Use the request URL itself as the primary component of the cache key for HTTP requests.
  const cacheKey = new Request(new URL(request.url).toString(), request);

  let response = await cache.match(cacheKey);

  if (!response) {
    console.log('HTTP Request: Cache miss. Fetching from origin (Google Script)...');
    response = await fetchAndCacheData(request.url); // Pass the request URL to be used as cache key
  }
  else {
    console.log('HTTP Request: Cache hit.');
  }

  // Add CORS headers to the response
  const corsResponse = new Response(response.body, response);
  corsResponse.headers.set("Access-Control-Allow-Origin", "*");
  corsResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  corsResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return corsResponse;
}

/**
 * Fetches data from Google Script and caches it.
 * This function will be used by both HTTP requests (on cache miss) 
 * and the scheduled cron job.
 * @param {string} cacheUrlKey - The URL to use as the basis for the cache key.
 */
async function fetchAndCacheData(cacheUrlKey) {
  if (!GOOGLE_SCRIPT_URL) {
    console.error("Error: GOOGLE_SCRIPT_URL is not configured.");
    return new Response("Configuration error: GOOGLE_SCRIPT_URL is not set.", { status: 500 });
  }

  try {
    console.log(`Fetching data from Google Script: ${GOOGLE_SCRIPT_URL}`);
    const originResponse = await fetch(GOOGLE_SCRIPT_URL);

    if (!originResponse.ok) {
      const errorText = await originResponse.text();
      console.error(`Error fetching from Google Script: ${originResponse.status} ${originResponse.statusText} - ${errorText}`);
      return new Response(`Error fetching data from Google Script: ${originResponse.status} ${errorText}`, { status: originResponse.status });
    }

    // Create a new Response object that can be cached.
    const responseToCache = new Response(originResponse.body, originResponse);
    responseToCache.headers.set('Content-Type', 'application/json');
    responseToCache.headers.set('Cache-Control', `public, max-age=${CACHE_DURATION_SECONDS}`);
    
    const cache = caches.default;
    // IMPORTANT: The cache key for storing MUST match how handleRequest will look for it.
    // We use the passed cacheUrlKey (which would be the worker's own URL for requests)
    const cacheKeyForStorage = new Request(new URL(cacheUrlKey).toString());

    await cache.put(cacheKeyForStorage, responseToCache.clone()); 
    console.log(`Data fetched and cached successfully for key: ${cacheUrlKey}`);
    return responseToCache;

  } catch (error) {
    console.error("Error in fetchAndCacheData:", error);
    return new Response("Error fetching or caching data: " + error.message, { status: 500 });
  }
}

/**
 * Handles the scheduled (cron) event.
 */
async function triggerScheduledUpdate(event) {
  console.log(`Cron job triggered at ${new Date(event.scheduledTime).toISOString()}: Refreshing Google Sheet data cache.`);
  
  // Define the canonical URL for your job data endpoint served by this worker.
  // This should be the URL that your Astro app calls, e.g., https://job-board-api.randyh628.workers.dev/
  // It's crucial this matches how handleRequest derives its cacheKey, or you'll cache for cron but not serve it.
  // Assuming your worker is at job-board-api.randyh628.workers.dev and Astro calls the root `/`.
  const canonicalJobDataUrl = "https://job-board-api.randyh628.workers.dev/"; // WORKER_URL from Astro

  await fetchAndCacheData(canonicalJobDataUrl);
  console.log("Cron job: Cache refresh attempt complete.");
}

// Ensure GOOGLE_SCRIPT_URL is accessible (it's set as an environment variable in Cloudflare)
// No explicit declaration like `const GOOGLE_SCRIPT_URL = '...';` is needed here. 