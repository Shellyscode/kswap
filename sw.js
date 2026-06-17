/* ===================================================
   K-SWAP Service Worker — Push Notifications
   =================================================== */

const CACHE_NAME = 'kswap-v1';
const STATIC_ASSETS = ['/', '/index.html', '/style.css', '/app.js'];

// Install — cache static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).catch(function(err) {
      console.log('Cache failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function() {
      return caches.match('/index.html');
    })
  );
});

// Push — show notification
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = { title: 'K-SWAP', body: e.data ? e.data.text() : 'New activity on K-SWAP' }; }

  var title = data.title || 'K-SWAP';
  var options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'View', icon: '/icon-192.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'dismiss') return;
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url === url && 'focus' in windowClients[i]) {
          return windowClients[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
