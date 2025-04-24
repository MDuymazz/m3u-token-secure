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
#EXTINF:-1 tvg-name="" tvg-logo="" tvg-language="Turkish" tvg-country="TR" group-title="TOKEN BAŞKA CİHAZDA KULLANILDI",DEVAM EDİLEMİYOR....
https://playerpro.live/proxy.php?url=https://a.strmrdr-.m3u8`;

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
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
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
