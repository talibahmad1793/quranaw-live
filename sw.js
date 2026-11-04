/* QuranAnyWhere service worker — "Hadith of the Day" push notifications.
 *
 * Kept deliberately small: it only handles push + notification clicks and
 * does NOT cache pages, so it can never serve a stale copy of the site.
 * The same file works on Live (scope "/") and UAT (scope "/QuranAnyWhere/")
 * because every URL is built from this worker's own registration scope.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const scope = self.registration.scope; // e.g. https://www.quranaw.com/
  const title = data.title || "Hadith of the Day";
  const options = {
    body: data.body || "Aaj ki hadith padhne ke liye tap karein.",
    icon: new URL("android-chrome-192x192.png", scope).href,
    badge: new URL("favicon-32x32.png", scope).href,
    tag: data.tag || "hadith-of-the-day", // a new day's hadith replaces yesterday's
    renotify: true,
    data: { url: data.path ? new URL(data.path.replace(/^\//, ""), scope).href : scope },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) return client.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
