const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";  // JSON dosyasına ulaşılacak link
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";  // Playlist.m3u'ya ulaşılacak link

async function handleRequest(request) {
    const url = new URL(request.url);
    let key = url.searchParams.get("key");

    if (!key) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    // Eğer .m3u uzantısı yoksa ekle
    if (!key.endsWith(".m3u")) {
        return new Response("Lütfen geçerli bir key ile .m3u uzantısını ekleyin.", { status: 400 });
    }

    // Token'ı .m3u uzantısından önceki kısmı al
    key = key.slice(0, -4); // Son 4 karakteri, yani .m3u'yu kesiyoruz

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();
    const user = Object.values(usersData).find(user => user.secret_key === key);

    if (!user) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    // Token'ı daha önce kullanılmışsa
    if (user.used) {
        return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
    }

    // Türkiye saatiyle token süresi kontrolü
    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);
    const turkeyTime = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    
    if (turkeyTime > expireDate) {
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
    }

    // Eğer token geçerli ve kullanılmamışsa, m3u dosyasını alıyoruz ve raw formatında döndürüyoruz.
    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    // Token'ı kullanıldığını işaretle (used: true)
    user.used = true;

    // Kullanıcı verisini güncelle
    await fetch(usersUrl, {
        method: "PUT",  // Güncelleme yapmak için PUT kullanıyoruz
        body: JSON.stringify(usersData),
        headers: {
            "Content-Type": "application/json"
        }
    });

    return new Response(m3uData, {
        headers: {
            "Content-Type": "text/plain",  // .m3u raw formatı için düz metin başlığı
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
