const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://api.github.com/repos/MDuymazz/Py/contents/playlist.m3u";
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy";

// Cloudflare Workers environment variable olarak GH_TOKEN'ı almak
const GH_TOKEN = ENV.GH_TOKEN;

async function handleRequest(request) {
    const url = new URL(request.url);
    let key = url.searchParams.get("key");

    if (!key) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    if (!key.endsWith(".m3u")) {
        return new Response("Lütfen geçerli bir key ile .m3u uzantısını ekleyin.", { status: 400 });
    }

    key = key.slice(0, -4); // key'i .m3u uzantısından temizliyoruz

    // Kullanıcı verisini JSON'dan çekiyoruz
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

    const discordMessage = {
        embeds: [
            {
                title: "Token Durumu",
                description: `Token ${key} kullanıldı.\nKullanıcı IP: ${ip}`,
                color: 3066993,
                fields: [
                    {
                        name: "Kullanıcı Bilgileri",
                        value: `Token: ${key}\nIP: ${ip}`,
                    },
                    {
                        name: "İlgili Linkler",
                        value: "[Destek Alın](http://iptv-info.local/token-hatasi)\n[Süre Doldu Linki](http://iptv-info.local/sure-doldu1)"
                    }
                ],
                footer: {
                    text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`,
                },
            }
        ]
    };

    // Token başka cihazda kullanılmışsa
    if (user.used && user.ip !== ip) {
        discordMessage.embeds[0].color = 16776960;
        discordMessage.embeds[0].description = `Token ${key} başka bir IP adresi üzerinden kullanılmıştır.\nYeni IP: ${ip}`;
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });

        const customM3U = `#EXTM3U

#EXTINF:-1 tvg-name="UYARI" tvg-logo="https://cdn-icons-png.flaticon.com/512/595/595067.png" group-title="BU TOKEN BAŞKA BİR CİHAZDA KULLANILMIŞ!", LÜTFEN DESTEK ALINIZ...
http://iptv-info.local/token-hatasi`;

        return new Response(customM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    // Token süresi dolmuşsa
    if (currentDate > turkeyTime) {
        discordMessage.embeds[0].color = 16711680;
        discordMessage.embeds[0].description = `Token ${key} süresi dolmuş.\nKullanıcı IP: ${ip}`;
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });

        const expiredM3U = `#EXTM3U

#EXTINF:-1 tvg-name="UYARI" tvg-logo="https://cdn-icons-png.flaticon.com/512/595/595067.png" group-title="TOKEN SÜRESİ DOLMUŞ!", LÜTFEN DESTEK ALINIZ...
http://iptv-info.local/sure-doldu1`;

        return new Response(expiredM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    // M3U linkini almak
    const m3uResponse = await fetch(m3uLink, {
        headers: {
            Authorization: `token ${GH_TOKEN}`
        }
    });

    const m3uData = await m3uResponse.json();
    const content = Buffer.from(m3uData.content, 'base64').toString('utf-8');

    return new Response(content, {
        headers: {
            "Content-Type": "application/x-mpegURL"
        }
    });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
