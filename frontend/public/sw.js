/*
 * TopStockBD service worker — web push only.
 *
 * Deliberately NOT a caching/offline worker: market data is live, so stale
 * cached prices would be a correctness bug. This handles exactly two events —
 * `push` (show the notification) and `notificationclick` (open/focus the deep
 * link). Bump SW_VERSION when this file changes; skipWaiting + clients.claim
 * roll the update out on the next visit.
 */
const SW_VERSION = "v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TopStockBD";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-96.png",
    tag: data.tag || "topstockbd",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              try {
                client.navigate(url);
              } catch (e) {
                /* cross-origin or detached — ignore */
              }
            }
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
