const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json"; // Kullanıcılar JSON
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u"; // M3U dosyasının linki

// M3U dosyasını almak için
async function fetchM3U() {
    const response = await fetch(m3uLink);
    const data = await response.text();
    return data;
}

async function handleRequest(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP");
    const key = url.searchParams.get("key");

    // IP ve key kontrolü
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

    // Her şey geçerliyse M3U dosyasını al ve döndür
    const m3uContent = await fetchM3U();
    
    return new Response(m3uContent, {
        headers: { "Content-Type": "application/x-mpegURL" }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
