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
    if (currentDate > expireDate) {
        discordMessage.embeds[0].color = 15158332;
        discordMessage.embeds[0].description = `Token ${key} süresi dolmuş.\nIP: ${ip}`;
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });

        const expiredM3U = `#EXTM3U

#EXTINF:-1 tvg-name="SÜRE BİTTİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="IPTV SÜRENİZ DOLMUŞTUR!", IPTV SÜRENİZ DOLMUŞTUR!
https://iptv-info.local/sure-doldu1

#EXTINF:-1 tvg-name="SATIN AL" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828925.png" group-title="İLETİŞİME GEÇİNİNİZ.", IPTV SÜRESİ UZATMAK İÇİN BİZİMLE İLETİŞİME GEÇİN!
https://iptv-info.local/sure-doldu2`;

        return new Response(expiredM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    // Geri kalan senaryolar için embed güncellemesi
    if (user.used && user.ip === ip) {
        const timeDiff = expireDate - currentDate;
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        if (timeDiff <= oneWeekInMs) {
            discordMessage.embeds[0].color = 808080;
            discordMessage.embeds[0].description = `Token ${key} süresinin bitmesine 1 hafta kaldı.\nIP: ${ip}`;
        }
    } else if (!user.used && user.ip === ip) {
        discordMessage.embeds[0].color = 0x000000;
        discordMessage.embeds[0].description = `Yeni token, aynı IP üzerinden kullanıldı.\nToken: ${key}\nIP: ${ip}`;
    } else if (!user.used && user.ip !== ip) {
        discordMessage.embeds[0].color = 0xFFFFFF;
        discordMessage.embeds[0].description = `Yeni token, yeni IP üzerinden kullanıldı.\nToken: ${key}\nIP: ${ip}`;
    }

    const expireString = turkeyTime.toLocaleString("tr-TR", {
        timeZone: user.timezone || "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });

    const expireInfo = `#EXTINF:-1 tvg-name="BİLGİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828970.png" group-title="IPTV BİTİŞ SÜRESİ: ${expireString}", İYİ GÜNLERDE KULLANIN..
http://iptv-info.local/expire`;

    const m3uResponse = await fetch(m3uLink);
    let m3uData = await m3uResponse.text();

    if (m3uData.startsWith("#EXTM3U")) {
        m3uData = m3uData.replace("#EXTM3U", `#EXTM3U\n${expireInfo}`);
    }

    // Kullanıcıyı işaretle ve kaydet
    user.used = true;
    user.ip = ip;

    await fetch(usersUrl, {
        method: "PUT",
        body: JSON.stringify(usersData),
        headers: {
            "Content-Type": "application/json"
        }
    });

    // Discord mesajı gönder
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
