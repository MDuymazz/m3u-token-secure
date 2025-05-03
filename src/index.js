const m3uUrl = "https://raw.githubusercontent.com/zerodayip/Py/refs/heads/main/m3u8/playlist.m3u"; // M3U dosyasının raw URL'si
const usersUrl = "https://raw.githubusercontent.com/zerodayip/m3u-token-secure/refs/heads/main/users.json";
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

    key = key.slice(0, -4); // .m3u uzantısını çıkartıyoruz

    // Kullanıcı bilgilerini güvenli şekilde alıyoruz
    let usersData;
    try {
        const usersResponse = await fetch(usersUrl);
        if (!usersResponse.ok) {
            throw new Error(`GitHub isteği başarısız oldu. Status: ${usersResponse.status}`);
        }
        usersData = await usersResponse.json();
    } catch (error) {
        return new Response("Kullanıcı verisi alınamadı: " + error.message, { status: 500 });
    }

    const user = Object.values(usersData).find(user => user.secret_key === key);

    if (!user) {
        return new Response("Geçersiz key!", { status: 403 });
    }

    const ip = request.headers.get("CF-Connecting-IP");
    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);
    const turkeyTime = new Date(expireDate.toLocaleString("en-US", { timeZone: user.timezone || "Europe/Istanbul" }));

    // Süresi dolmuş mu?
    if (currentDate > expireDate) {
        const expiredM3U = `#EXTM3U

#EXTINF:-1 tvg-name="SÜRE BİTTİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="IPTV SÜRENİZ DOLMUŞTUR!", IPTV SÜRENİZ DOLMUŞTUR!
https://iptv-info.local/sure-doldu1

#EXTINF:-1 tvg-name="SATIN AL" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828925.png" group-title="İLETİŞİME GEÇİNİNİZ.", IPTV SÜRESİ UZATMAK İÇİN BİZİMLE İLETİŞİME GEÇİN!
https://iptv-info.local/sure-doldu2`;

        await sendDiscordNotification("Token Süresi Dolmuş", key, ip, 15158332);

        return new Response(expiredM3U, {
            headers: { "Content-Type": "text/plain" }
        });
    }

    // Başka cihazdan mı kullanılıyor?
    if (user.used && user.ip !== ip) {
        await sendDiscordNotification("Token Başka Cihazda Kullanıldı", key, ip, 16776960);

        const warningM3U = `#EXTM3U

#EXTINF:-1 tvg-name="UYARI" tvg-logo="https://cdn-icons-png.flaticon.com/512/595/595067.png" group-title="BU TOKEN BAŞKA BİR CİHAZDA KULLANILMIŞ!", LÜTFEN DESTEK ALINIZ...
http://iptv-info.local/token-hatasi`;

        return new Response(warningM3U, {
            headers: { "Content-Type": "text/plain" }
        });
    }

    // Normal kullanım
    let m3uData = await fetchM3UData();
    if (user.used && user.ip === ip) {
        const timeDiff = expireDate - currentDate;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (timeDiff <= oneWeek) {
            m3uData = appendExpireInfo(m3uData, expireDate);
        }
    }

    user.used = true;
    user.ip = ip;

    // Kullanıcı verisini güncelle (şu anda gerçek güncelleme yapamıyoruz çünkü github raw json değiştirilemiyor)

    await sendDiscordNotification("Yeni Token Kullanımı", key, ip, 3066993);

    return new Response(m3uData, {
        headers: { "Content-Type": "text/plain" }
    });
}

async function fetchM3UData() {
    const response = await fetch(m3uUrl, {
        headers: {
            "Authorization": `Bearer ${GH_TOKEN}`,
        }
    });
    if (!response.ok) {
        throw new Error("GitHub'dan M3U verisi alınamadı");
    }
    return await response.text();
}

function appendExpireInfo(m3uData, expireDate) {
    const expireString = expireDate.toLocaleString("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });

    const expireInfo = `#EXTINF:-1 tvg-name="BİLGİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828970.png" group-title="IPTV BİTİŞ SÜRESİ: ${expireString}", İYİ GÜNLERDE KULLANIN..
http://iptv-info.local/expire`;

    // #EXTM3U başındaki boşlukları temizle ve expireInfo'yu ekle
    m3uData = m3uData.replace(/^#EXTM3U\s*/m, `#EXTM3U\n${expireInfo}\n`);

    return m3uData;
}

async function sendDiscordNotification(title, key, ip, color) {
    const discordMessage = {
        embeds: [
            {
                title: title,
                description: `Token kullanıldı. ${key}`,
                color: color,
                fields: [
                    {
                        name: "Token Bilgisi",
                        value: `Token: ${key}\nIP: ${ip}`
                    }
                ],
                footer: {
                    text: `IPTV Sistem Bilgisi | ${new Date().toLocaleString()}`
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

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
