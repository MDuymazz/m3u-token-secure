export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip");
    const key = url.searchParams.get("key");

    if (!ip || !key) {
      return new Response("Eksik parametre.", { status: 400 });
    }

    const response = await fetch("https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/main/users.json");
    const users = await response.json();

    const user = users.find(u => u.ip === ip && u.key === key);

    if (!user) {
      return new Response("Yetkisiz erişim.", { status: 403 });
    }

    const now = new Date();
    const expiry = new Date(user.expires);

    if (now > expiry) {
      return new Response("Token süresi dolmuş.", { status: 403 });
    }

    const m3u = await fetch("https://raw.githubusercontent.com/MDuymazz/sitem3u/main/playlist.m3u");
    const text = await m3u.text();

    return new Response(text, {
      headers: {
        "Content-Type": "audio/x-mpegurl"
      }
    });
  }
};
