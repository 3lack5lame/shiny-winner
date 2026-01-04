self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { clients.claim(); });
self.addEventListener('fetch', event => { /* basic offline support can be added here */ });
