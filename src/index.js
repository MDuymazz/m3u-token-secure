addEventListener("fetch", event => {
  event.respondWith(
    new Response("Merhaba, Worker çalışıyor!", {
      headers: { "Content-Type": "text/plain" },
    })
  );
});
