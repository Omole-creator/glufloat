/* Glufloat service worker: shows the meal-time reminder and opens the app when
   it is tapped. Kept tiny on purpose; it does nothing else. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "Before you eat, ask Glufloat";
  const body =
    data.body || "About to eat? Check your meal on Glufloat first.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: "glufloat-mealtime", // one reminder at a time, never a stack
      data: { url: data.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
