const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    let key = url.searchParams.get("key");

    if (!key) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    if (!key.endsWith(".m3u")) {
        return new Response("Lütfen key sonuna .m3u ekleyin!", { status: 400 });
    }

    key = key.slice(0, -4); // .m3u uzantısını temizle
    const ip = request.headers.get("CF-Connecting-IP");

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();
    const user = Object.values(usersData).find(user => user.secret_key === key);

    if (!user) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    const turkeyTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const expireDate = new Date(user.expire_date);

    if (turkeyTime > expireDate) {
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
    }

    // Kullanım kontrolü
    if (user.used && user.owner !== ip) {
        return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
    }

    // M3U dosyasını al
    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    // Eğer ilk kez kullanılıyorsa, log tutmak istersen Cloudflare Logpush kullanılabilir (manuel)
    // Burada dosya yazılmaz, sadece çalışır.
    
    return new Response(m3uData, {
        headers: {
            "Content-Type": "text/plain",
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
