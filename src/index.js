const m3uUrl = "https://raw.githubusercontent.com/MDuymazz/Py/refs/heads/main/m3u8/playlist.m3u"; // M3U dosyasının raw URL'si
const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy";

// Asıl handler fonksiyonumuz
async function handleRequest(request) {
    const url = new URL(request.url);
    let key = url.searchParams.get("key");

    if (!key) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    if (!key.endsWith(".m3u")) {
        return new Response("Lütfen geçerli bir key ile .m3u uzantısını ekleyin.", { status: 400 });
    }

    key = key.slice(0, -4);

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();
    const user = Object.values(usersData).find(user => user.secret_key === key);

    if (!user) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    const ip = request.headers.get("CF-Connecting-IP");
    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);
    const turkeyTime = new Date(expireDate.toLocaleString("en-US", { timeZone: user.timezone || "Europe/Istanbul" }));

    // GitHub'dan m3u dosyasını al
    const response = await fetch(m3uUrl, {
        headers: {
            "Authorization": `Bearer ${GH_TOKEN}`,  // Token ile kimlik doğrulama
        }
    });

    if (!response.ok) {
        return new Response("GitHub'dan veri alınamadı", { status: 500 });
    }

    let m3uData = await response.text();

    // Eğer m3u dosyasının başında "#EXTM3U" varsa, üzerine kullanıcı bilgilerini ekleyelim
    if (m3uData.startsWith("#EXTM3U")) {
        m3uData = m3uData.replace("#EXTM3U", `#EXTM3U\n#EXTINF:-1 tvg-name="BİLGİ" group-title="IPTV BİTİŞ SÜRESİ: ${expireDate}", İYİ GÜNLERDE KULLANIN..`);
    }

    // Geriye kalan işlemler...
    
    // Discord'a mesaj gönder
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: `Yeni bir token kullanımı: ${key}, IP: ${ip}`
        }),
    });

    return new Response(m3uData, {
        headers: {
            "Content-Type": "text/plain",
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
