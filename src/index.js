const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";  // JSON dosyasına ulaşılacak link
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";  // Playlist.m3u'ya ulaşılacak link

async function handleRequest(request) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    // users.json'dan verileri alıyoruz
    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();
    const user = Object.values(usersData).find(user => user.secret_key === key);

    if (!user) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    // Tokenin süresi dolmuşsa
    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);
    if (currentDate > expireDate) {
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
    }

    // Token kullanılmışsa, hata mesajı gönderiyoruz
    if (user.used) {
        return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
    }

    // Kullanıcıyı 'used: true' olarak güncelliyoruz
    user.used = true;

    // users.json'ı güncellemek için yine veritabanına ya da dosyaya gönderme işlemi yapılabilir.
    // Bu kısmı, gerçek dünyada kullanıcı verilerini kaydetmek için uygun bir veri saklama alanına yapmanız gerekecek.

    // M3u dosyasını alıyoruz
    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    // M3u verisini raw formatında geri döndürüyoruz
    return new Response(m3uData, {
        headers: {
            "Content-Type": "application/vnd.apple.mpegurl"  // m3u formatı için Content-Type başlığı
        }
    });
}

// Cloudflare worker için fetch eventini dinliyoruz
addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
