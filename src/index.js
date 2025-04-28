const usersApiUrl = "https://api.github.com/repos/MDuymazz/m3u-token-secure/contents/users.json"; 
const m3uLink = "https://api.github.com/repos/MDuymazz/Py/contents/playlist.m3u"; 
const webhookUrl = "https://canary.discord.com/api/webhooks/1364967293737766964/qz8YIsZEqo-E_StXVcgdrNQZjvFk5349nIdZ8z-LvP-Uzh69eqlUPBP9p-QGcrs12dZy"; 

// Ana işlev
async function handleRequest(request) { 
    const url = new URL(request.url); 
    let key = url.searchParams.get("key"); 
    
    // Eğer 'key' yoksa hata döndür
    if (!key) { 
        return new Response("Key bulunamadı!", { status: 400 }); 
    }

    // Eğer 'key' .m3u ile bitmiyorsa hata döndür
    if (!key.endsWith(".m3u")) { 
        return new Response("Lütfen geçerli bir key ile .m3u uzantısını ekleyin.", { status: 400 }); 
    }

    // 'key' parametresinden .m3u kısmını çıkart
    key = key.slice(0, -4);

    // GitHub'dan kullanıcı verisini al
    const usersResponse = await fetch(usersApiUrl, { 
        headers: { 
            Authorization: `Bearer ${process.env.GH_TOKEN}`, 
            "Accept": "application/vnd.github+json", 
        } 
    });

    // Kullanıcı verilerini çözümler
    const usersJson = await usersResponse.json(); 
    const usersData = JSON.parse(atob(usersJson.content)); 

    // 'key' ile eşleşen kullanıcıyı bul
    const user = Object.values(usersData).find(user => user.secret_key === key);  
    
    if (!user) { 
        return new Response("Geçersiz key!", { status: 403 }); 
    }

    // Kullanıcı IP adresini al
    const ip = request.headers.get("CF-Connecting-IP"); 
    const currentDate = new Date(); 
    const expireDate = new Date(user.expire_date);

    // Discord mesajı hazırla
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

    // Eğer kullanıcı daha önce bu token'ı kullanmış ve IP farklıysa
    if (user.used && user.ip !== ip) { 
        discordMessage.embeds[0].color = 16776960; 
        discordMessage.embeds[0].description = `Token ${key} başka bir IP adresi üzerinden kullanılmıştır.\nYeni IP: ${ip}`; 
        await sendDiscordWebhook(discordMessage); 

        const customM3U = `#EXTM3U #EXTINF:-1 tvg-name="UYARI" tvg-logo="https://cdn-icons-png.flaticon.com/512/595/595067.png" group-title="BU TOKEN BAŞKA BİR CİHAZDA KULLANILMIŞ!", LÜTFEN DESTEK ALINIZ... http://iptv-info.local/token-hatasi`; 

        return new Response(customM3U, { headers: { "Content-Type": "text/plain" } }); 
    }

    // Eğer token süresi dolmuşsa
    if (currentDate > expireDate) { 
        discordMessage.embeds[0].color = 15158332; 
        discordMessage.embeds[0].description = `Token ${key} süresi dolmuş.\nIP: ${ip}`; 
        await sendDiscordWebhook(discordMessage); 

        const expiredM3U = `#EXTM3U #EXTINF:-1 tvg-name="SÜRE BİTTİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1062/1062832.png" group-title="IPTV SÜRENİZ DOLMUŞTUR!", IPTV SÜRENİZ DOLMUŞTUR! https://iptv-info.local/sure-doldu1 #EXTINF:-1 tvg-name="SATIN AL" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828925.png" group-title="İLETİŞİME GEÇİN.", IPTV SÜRESİ UZATMAK İÇİN BİZİMLE İLETİŞİME GEÇİN! https://iptv-info.local/sure-doldu2`; 

        return new Response(expiredM3U, { headers: { "Content-Type": "text/plain" } }); 
    }

    // Eğer token geçerli ise ve süresi dolmadıysa
    if (user.used && user.ip === ip) { 
        const timeDiff = expireDate - currentDate; 
        const oneWeek = 7 * 24 * 60 * 60 * 1000; 
        
        if (timeDiff <= oneWeek) { 
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

    // Kullanıcı bilgileri ve süre bilgisi
    const expireString = new Date(user.expire_date).toLocaleString("tr-TR", { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
    });

    const expireInfo = `#EXTINF:-1 tvg-name="BİLGİ" tvg-logo="https://cdn-icons-png.flaticon.com/512/1828/1828970.png" group-title="IPTV BİTİŞ SÜRESİ: ${expireString}", İYİ GÜNLERDE KULLANIN.. http://iptv-info.local/expire`;

    // M3U dosyasını GitHub'dan al
    const m3uResponse = await fetch(m3uLink, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.GH_TOKEN}`, // Token ile erişim sağlıyoruz
            'Accept': 'application/vnd.github.v3.raw', // Raw dosya formatında al
        }
    });

    let m3uData = await m3uResponse.text();

    // Eğer m3u dosyası başlıyorsa, içine süre bilgisini ekle
    if (m3uData.startsWith("#EXTM3U")) { 
        m3uData = m3uData.replace("#EXTM3U", `#EXTM3U\n${expireInfo}`);
    }

    // Kullanıcı IP'sini m3u dosyasına yerleştir
    m3uData = m3uData.replace("{{user_ip}}", user.ip);

    // Kullanıcı bilgilerini güncelle
    user.used = true; 
    user.ip = ip; 
    await updateUsersJson(usersData, usersJson.sha); 

    // Discord webhook mesajı gönder
    await sendDiscordWebhook(discordMessage); 

    // Güncellenmiş m3u dosyasını döndür
    return new Response(m3uData, { headers: { "Content-Type": "text/plain" } }); 
}

// Discord Webhook'ına mesaj gönderme
async function sendDiscordWebhook(message) { 
    await fetch(webhookUrl, { 
        method: "POST", 
        headers: { 
            "Content-Type": "application/json", 
        }, 
        body: JSON.stringify(message), 
    }); 
}

// users.json dosyasını güncelleme
async function updateUsersJson(updatedUsersData, sha) { 
    const githubApiUrl = "https://api.github.com/repos/MDuymazz/m3u-token-secure/contents/users.json"; 
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedUsersData, null, 2)))); 

    const updateResponse = await fetch(githubApiUrl, { 
        method: "PUT", 
        headers: { 
            Authorization: `Bearer ${process.env.GH_TOKEN}`, 
            "Accept": "application/vnd.github+json", 
        }, 
        body: JSON.stringify({ 
            message: "Update users.json with new data", 
            sha: sha, 
            content: content, 
        }) 
    }); 

    if (!updateResponse.ok) { 
        console.error("users.json güncellenemedi:", updateResponse.statusText); 
    } 
}

// Worker request işleme
addEventListener('fetch', event => { 
    event.respondWith(handleRequest(event.request)); 
});
