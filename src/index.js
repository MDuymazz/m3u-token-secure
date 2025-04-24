const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    const keyParam = url.searchParams.get("key");

    if (!keyParam) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();

    const userEntry = Object.entries(usersData).find(
        ([, user]) => user.secret_key === keyParam
    );

    if (!userEntry) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    const [, user] = userEntry;

    // Türkiye saat dilimine çevrilmiş zaman
    const currentDate = new Date();
    const turkeyTime = currentDate.getTime() + (3 * 60 * 60 * 1000); // UTC+3
    const expireDate = new Date(user.expire_date).getTime();

    if (turkeyTime > expireDate) {
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
    }

    // Token daha önce kullanıldıysa
    if (user.used) {
        return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
    }

    // Kullanılmadıysa, token'i işaretle
    user.used = true;
    
    // Güncel kullanıcı bilgilerini json dosyasına kaydet
    await fetch(usersUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usersData),
    });

    // Eğer token geçerli ise, m3u dosyasını alıyoruz ve raw formatında döndürüyoruz.
    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    return new Response(m3uData, {
        headers: {
            "Content-Type": "application/vnd.apple.mpegurl",  // m3u formatı için Content-Type başlığı
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
