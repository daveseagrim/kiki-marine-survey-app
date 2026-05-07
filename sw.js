const CACHE_NAME = 'kiki-marine-v2541';

// v2392: Split cache targets into CRITICAL vs OPTIONAL to prevent "cache
// drift" — the bug class that crashed iPhone Safari in v2387.  Previously
// the install handler used cache.add(url).catch(warn) on every file, so a
// single flaky fetch could leave some files at vN and others at vN-1 inside
// the same cache bucket.  On next load the app would execute a mixed-version
// app.js against a mixed-version index.html → corrupted state → iOS kill.
//
// New contract:
//   • CRITICAL_URLS must ALL cache successfully or the install is aborted
//     and the incomplete cache bucket is deleted. Browser keeps the previous
//     (working) cache active; SW retries install on next page load.
//   • OPTIONAL_URLS are cached with tolerance — individual failures log a
//     warning but don't block install. Network falls back to origin fetch
//     on demand, which is fine for icons and the external Firebase SDK.
const CRITICAL_URLS = [
  './',
  'index.html',
  'app.js',
  'src/core/ratings.js',
  'src/core/placeholders.js',
  'src/core/skip_logic.js',
  'src/core/drive_backup.js',
  'src/core/snippet_tokens.js',
  'src/core/component_builder.js',
  'src/core/attendees.js',
  'manifest.json',
  'survey_template.json',
  'insurance_survey_template.json',
  'text_library.json',
  'boat_specs_db.json',
  'boat_values_db.json',
  'engine_db.json',
  'outdrive_db.json',
  'winch_db.json',
  'dictionary.json',
];
const OPTIONAL_URLS = [
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192-maskable.png',
  'icon-512-maskable.png',
  'signature.png',
  'new_logo.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
];

// Listen for SKIP_WAITING message from the app (force-update flow)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event — v2392 atomic install.
// CRITICAL files are cached under Promise.all without per-file .catch, so the
// first failure rejects the whole install.  On rejection we delete the
// incomplete CACHE_NAME bucket so the next install attempt starts from a
// clean slate instead of building on a half-populated cache.  Browser keeps
// the previous working SW active in the meantime.
// OPTIONAL files still tolerate per-file failures.
// skipWaiting() is called only after all critical files cache successfully —
// no point promoting a broken SW.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // Atomic: first rejection kills the whole Promise.all
        await Promise.all(CRITICAL_URLS.map((url) => cache.add(url)));
      } catch (err) {
        console.error('SW: critical file failed to cache — aborting install', err);
        // Clean up the incomplete cache bucket so next attempt starts fresh
        try { await caches.delete(CACHE_NAME); } catch (_) {}
        throw err; // reject install → old SW stays active
      }
      // Optional files: per-file .catch so individual failures don't block
      await Promise.all(
        OPTIONAL_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW: failed to cache optional', url, err);
          })
        )
      );
      // Only skip waiting if we got here — critical files all cached
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches and reload all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    // v2247: removed force-navigate of all clients — the controllerchange
    // listener in app.js already handles reloads gracefully. Force-navigating
    // caused crash-like restarts on iPhone PWA.
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // B-03 history:
  //   v2159 added an explicit SW proxy for Firebase Cloud hostnames.
  //   v2160 passed the proxy error through.
  //   v2160 diagnostic proved the SW's internal fetch hits the SAME
  //     "TypeError: Load failed" that page-context fetch hits — so the
  //     restriction isn't caused by the SW. Keeping the proxy active does
  //     nothing useful; the proxy's own fetch just fails.
  //   v2161: REVERT the Firebase proxy and let passive return handle these
  //     requests (let the browser do the fetch natively, error or not).
  //     Don't intercept other external API calls either — weather, Nominatim,
  //     etc. all work fine with passive return.

  // Don't intercept external API calls (weather, location search, map tiles, etc.)
  // Let them go straight to the network so errors propagate properly.
  // Exception: Firebase SDK files from gstatic.com — serve from cache for offline
  const isFirebaseSDK = url.origin === 'https://www.gstatic.com' && url.pathname.includes('firebasejs');
  if (url.origin !== self.location.origin && !isFirebaseSDK) {
    return;
  }

  // Firebase SDK: cache-first (they're versioned, so the cached version is always correct)
  if (isFirebaseSDK) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // App JS and JSON data files use network-first strategy so updates
  // are picked up immediately. Falls back to cache when offline.
  const isAppJS = url.pathname.endsWith('app.js') || url.search.includes('app.js');
  const isDataFile = url.pathname.endsWith('.json');

  if (isDataFile || isAppJS) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed — serve from cache (offline fallback)
        return caches.match(event.request);
      })
    );
    return;
  }

  // App shell (HTML, JS, CSS, images) uses stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Serve from cache but also fetch in background to update
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {});
        return response;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return a fallback response if both cache and network fail
        return caches.match('./');
      });
    })
  );
});
