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

    // Token başka cihazda kullanılmışsa
    if (user.used && user.ip !== ip) {
        const customM3U = `#EXTM3U

#EXTINF:-1 tvg-name="UYARI" tvg-logo="https://cdn-icons-png.flaticon.com/512/595/595067.png" group-title="BU TOKEN BAŞKA BİR CİHAZDA KULLANILMIŞ!", LÜTFEN DESTEK ALINIZ...
http://iptv-info.local/token-hatasi`;

        return new Response(customM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    const currentDate = new Date();
    const expireDate = new Date(user.expire_date); // UTC formatındaki expire_date
    const turkeyTime = new Date(expireDate.toLocaleString("en-US", { timeZone: user.timezone || "Europe/Istanbul" }));

    // Token süresi dolmuşsa
    if (currentDate > expireDate) {
        const expiredM3U = `#EXTM3U

#EXTINF:-1 tvg-name="SÜRE BİTTİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="IPTV SÜRENİZ DOLMUŞTUR!", IPTV SÜRENİZ DOLMUŞTUR!
https://iptv-info.local/sure-doldu1

#EXTINF:-1 tvg-name="SATIN AL" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828925.png" group-title="İLETİŞİME GEÇİNİNİZ.", IPTV SÜRESİ UZATMAK İÇİN BİZİMLE İLETİŞİME GEÇİN!
https://iptv-info.local/sure-doldu2`;

        // Kırmızı renk için bildirim gönder
        const discordMessage = {
            embeds: [
                {
                    title: "Token Durumu",
                    description: `Token ${key} süresi dolmuş.\nIP: ${ip}`,
                    color: 15158332,  // Kırmızı renk
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
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });

        return new Response(expiredM3U, {
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    // Token başka bir IP adresi üzerinden kullanıldığında, sarı renk
    else if (user.used && user.ip !== ip) {
        const discordMessage = {
            embeds: [
                {
                    title: "Token Durumu",
                    description: `Token ${key} başka bir IP adresi üzerinden kullanılmıştır.\nYeni IP: ${ip}`,
                    color: 16776960,  // Sarı renk
                    fields: [
                        {
                            name: "Kullanıcı Bilgileri",
                            value: `Token: ${key}\nIP: ${ip}`,
                        },
                    ],
                    footer: {
                        text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`,
                    },
                }
            ]
        };
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });
    }

    // Token ve IP aynı ise ve 1 haftadan az kalmışsa, gri renk
    else if (user.used && user.ip === ip) {
        const timeDiff = expireDate - currentDate; // Kalan süre
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 hafta = 7 gün
        if (timeDiff <= oneWeekInMs) {
            const discordMessage = {
                embeds: [
                    {
                        title: "Token Durumu",
                        description: `Token ${key} süresinin bitmesine 1 hafta kaldı.\nIP: ${ip}`,
                        color: 808080,  // Gri renk
                        fields: [
                            {
                                name: "Kullanıcı Bilgileri",
                                value: `Token: ${key}\nIP: ${ip}`,
                            },
                        ],
                        footer: {
                            text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`,
                        },
                    }
                ]
            };
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordMessage),
            });
        }
    }

    // Yeni token ve aynı IP ise, siyah renk
    else if (!user.used && user.ip === ip) {
        const discordMessage = {
            embeds: [
                {
                    title: "Token Durumu",
                    description: `Yeni token, aynı IP üzerinden kullanıldı.\nToken: ${key}\nIP: ${ip}`,
                    color: 0x000000,  // Siyah renk
                    fields: [
                        {
                            name: "Kullanıcı Bilgileri",
                            value: `Token: ${key}\nIP: ${ip}`,
                        },
                    ],
                    footer: {
                        text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`,
                    },
                }
            ]
        };
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });
    }

    // Yeni token ve yeni IP ise, beyaz renk
    else if (!user.used && user.ip !== ip) {
        const discordMessage = {
            embeds: [
                {
                    title: "Token Durumu",
                    description: `Yeni token, yeni IP üzerinden kullanıldı.\nToken: ${key}\nIP: ${ip}`,
                    color: 0xFFFFFF,  // Beyaz renk
                    fields: [
                        {
                            name: "Kullanıcı Bilgileri",
                            value: `Token: ${key}\nIP: ${ip}`,
                        },
                    ],
                    footer: {
                        text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`,
                    },
                }
            ]
        };
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage),
        });
    }

    return new Response(m3uData, {
        headers: {
            "Content-Type": "text/plain",
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
