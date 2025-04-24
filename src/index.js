const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uUrl = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP");
    let keyWithExtension = url.searchParams.get("key");

    if (!keyWithExtension || !ip) {
        return new Response("IP veya key bulunamadı!", { status: 400 });
    }

    // .m3u uzantısını kaldırarak key'i ayır
    const key = keyWithExtension.replace(/\.m3u$/, "");

    // Kullanıcı verilerini çek
    const usersResponse = await fetch(usersUrl, {
        headers: { "Cache-Control": "no-cache" }
    });
    const usersData = await usersResponse.json();

    const user = usersData[ip];

    // Key doğrulama ve süre kontrolü
    if (!user || user.secret_key !== key) {
        return new Response("Geçersiz key veya IP!", { status: 403 });
    }

    const now = new Date();
    const expire = new Date(user.expire_date);

    if (now > expire) {
        return new Response("Token süresi dolmuş!", { status: 403 });
    }

    // M3U dosyasını çek ve düz metin olarak döndür
    const m3uResponse = await fetch(m3uUrl, {
        headers: { "Cache-Control": "no-cache" }
    });
    const m3uText = await m3uResponse.text();

    return new Response(m3uText, {
        headers: { "Content-Type": "application/x-mpegURL" }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
