const CACHE_NAME = 'kiki-marine-v2160';
const URLS_TO_CACHE = [
  './',
  'index.html',
  'app.js',
  'src/core/ratings.js',
  'src/core/placeholders.js',
  'src/core/skip_logic.js',
  'src/core/drive_backup.js',
  'src/core/snippet_tokens.js',
  'src/core/component_builder.js',
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
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192-maskable.png',
  'icon-512-maskable.png',
  'https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js',
];

// Listen for SKIP_WAITING message from the app (force-update flow)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event - cache essential files (tolerates individual failures
// so one missing file cannot prevent the service worker from installing)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        URLS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW: failed to cache', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
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
    }).then(() => {
      // Force all open tabs/PWA instances to reload with fresh code
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
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

  // B-03 fix attempt (v2159): iOS Safari PWA sometimes fails cross-origin
  // fetches when the SW "returns" passively (no respondWith). Explicitly
  // proxy fetches to Firebase Storage and Firestore through the SW so iOS
  // honors them. This is the fix for the "xhr: XHR network error" + "fetch:
  // TypeError Load failed" symptom Dave hit on 2026-04-14.
  const isFirebaseCloud = (
    url.hostname === 'firebasestorage.googleapis.com' ||
    url.hostname === 'firestore.googleapis.com' ||
    url.hostname.endsWith('.firebaseapp.com') ||
    url.hostname.endsWith('.firebaseio.com')
  );
  if (isFirebaseCloud) {
    event.respondWith(
      fetch(event.request).catch(err => {
        // On SW-proxy failure, pass the underlying error through in the
        // response body so app-level error handlers surface the real cause
        // (not an opaque 599). v2160: the app reads the body when status
        // is non-ok and includes the first ~140 chars in the error message.
        const name = (err && err.name) || 'Error';
        const msg = (err && err.message) || String(err);
        const detail = `SW proxy (${name}): ${msg}`;
        return new Response(detail, {
          status: 599,
          statusText: 'SW proxy fail',
          headers: { 'content-type': 'text/plain' }
        });
      })
    );
    return;
  }

  // Don't intercept other external API calls (weather, location search, map tiles, etc.)
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
