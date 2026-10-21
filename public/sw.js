self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = { title: 'Notification', body: event.data?.text() ?? 'No payload' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://via.placeholder.com/128',
      badge: 'https://via.placeholder.com/72',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
