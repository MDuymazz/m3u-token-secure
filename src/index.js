const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy";

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

    if (user.used && user.ip !== ip) {
        const customM3U = `#EXTM3U
#EXTINF:-1 tvg-name="TENIS" tvg-logo="https://w7.pngwing.com/pngs/639/775/png-transparent-green-tennis-ball-tennis-ball-cricket-the-us-open-tennis-tennis-ball-sport-sporting-goods-grass-thumbnail.png" tvg-language="Turkish" tvg-country="TR" group-title="GÜNLÜK SPOR AKIŞI 2 (MAÇ SAATİ)",CANLI (18:00) M.KEYS – L.BRONZETTI (BEIN SPORTS MAX 1)
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)
#EXTVLCOPT:http-referrer=https://golvar2363.sbs/
https://playerpro.live/proxy.php?url=https://a.strmrdr-
#EXTINF:-1 tvg-name="BASKETBOL" tvg-logo="https://cdn-icons-png.flaticon.com/512/861/861512.png" tvg-language="Turkish" tvg-country="TR" group-title="GÜNLÜK SPOR AKIŞI 2 (MAÇ SAATİ)",ANADOLU EFES – FENERBAHÇE (S SPORTS)
https://playerpro.live/proxy.php?url=https://b.strmrdr-`;

        return new Response(customM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);
    const turkeyTime = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

    if (turkeyTime > expireDate) {
        const expiredM3U = `#EXTM3U
#EXTINF:-1 tvg-name="SÜRE BİTTİ 1" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="Uyarı",SÜRENİZ DOLMUŞTUR
https://expired.example.com/stream1
#EXTINF:-1 tvg-name="SÜRE BİTTİ 2" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="Uyarı",SÜRENİZ DOLMUŞTUR
https://expired.example.com/stream2`;

        return new Response(expiredM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    user.used = true;
    user.ip = ip;

    await fetch(usersUrl, {
        method: "PUT",
        body: JSON.stringify(usersData),
        headers: {
            "Content-Type": "application/json"
        }
    });

    const discordMessage = {
        content: `Token ${key} kullanıldı.\nKullanıcı IP: ${ip}`,
    };

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMessage),
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
