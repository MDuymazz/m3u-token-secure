const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP");
    const key = url.searchParams.get("key");

    if (!key || !ip) {
        return new Response("IP veya key bulunamadı!", { status: 400 });
    }

    // Kullanıcıları yükle
    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();

    // IP'yi ve key'i doğrula
    const user = usersData[ip];

    if (!user || user.secret_key !== key) {
        return new Response("Geçersiz key veya IP!", { status: 403 });
    }

    // Token'ın geçerlilik süresi dolmadığını kontrol et
    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);

    if (currentDate > expireDate) {
        return new Response("Token süresi dolmuş!", { status: 403 });
    }

    // M3U dosyasını al
    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    // M3U dosyasını doğrudan IPTV player'ları için sunuyoruz
    return new Response(m3uData, {
        headers: { "Content-Type": "application/x-mpegURL" }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
