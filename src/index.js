const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy";

// Cloudflare Workers'da secrets kısmından GH_TOKEN alıyoruz
const GH_TOKEN = secrets.GH_TOKEN;  // GH_TOKEN'ı Cloudflare secrets'dan alıyoruz

const repoOwner = 'MDuymazz';
const repoName = 'Py';
const filePath = 'm3u8/playlist.m3u';

// GitHub API'yi kullanarak m3u dosyasını almak için gerekli URL
const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

async function fetchM3U() {
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${GH_TOKEN}`,  // GitHub API'ye erişim için token
            'Accept': 'application/vnd.github.v3.raw',  // Raw içerik almak için gerekli başlık
        },
    });

    if (!response.ok) {
        console.error(`GitHub API hatası: ${response.status} - ${response.statusText}`);
        return new Response("GitHub API'ye erişim sağlanamadı.", { status: 500 });
    }

    const data = await response.json();  // API'den JSON formatında döner
    const m3uContent = atob(data.content);  // GitHub'dan dönen Base64 kodlu içeriği çözme
    return m3uContent;  // Çözülmüş raw m3u içeriği döndürüyoruz
}

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

    // GitHub'dan m3u içeriğini çekiyoruz
    const m3uData = await fetchM3U();

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
