const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy";

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

    // Eğer token daha önce kullanıldıysa ve IP adresi uyuşmuyorsa, token kullanılamaz
    if (user.used) {
        const ip = request.headers.get("CF-Connecting-IP");

        // Eğer IP adresi eşleşmiyorsa, token geçersizdir
        if (user.ip !== ip) {
            return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
        }
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

    // Token'ı kullanıldığını işaretle (used: true) ve IP adresini kaydet
    user.used = true;
    user.ip = request.headers.get("CF-Connecting-IP");  // Bu token'ı kullanan IP'yi kaydet

    // Kullanıcı verisini güncelle
    await fetch(usersUrl, {
        method: "PUT",  // Güncelleme yapmak için PUT kullanıyoruz
        body: JSON.stringify(usersData),
        headers: {
            "Content-Type": "application/json"
        }
    });

    // Discord'a IP adresini gönder
    const ip = request.headers.get("CF-Connecting-IP");
    const discordMessage = {
        content: `Token ${key} kullanıldı.\nKullanıcı IP: ${ip}`,
    };

    // Discord'a mesaj gönder
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMessage),
    });

    // m3u verisini raw formatta döndür
    return new Response(m3uData, {
        headers: {
            "Content-Type": "text/plain",  // .m3u raw formatı için düz metin başlığı
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
