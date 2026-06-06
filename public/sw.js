self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Required for Chrome to recognize the app as an installable PWA
self.addEventListener('fetch', (event) => {
  // We don't need to cache anything right now, just providing the fetch handler 
  // satisfies the PWA installability criteria.
});

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/badge-72x72.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      actions: data.actions || [
        { action: 'view', title: 'View Lead' }
      ],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/leads',
        // Pass the actions array into data so notificationclick can read action URLs
        actionsData: data.actions || [] 
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Find the action that was clicked
  const actionsData = event.notification.data?.actionsData || [];
  const clickedAction = actionsData.find(a => a.action === event.action);

  if (event.action !== 'dismiss') {
    let targetUrl = event.notification.data?.url || '/leads';
    
    // If a specific action was clicked and it has a URL, use it
    if (clickedAction && clickedAction.url) {
      targetUrl = clickedAction.url;
    }

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close it, do nothing else
  }
});
