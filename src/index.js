const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    const rawKey = url.searchParams.get("key");

    if (!rawKey) {
        return new Response("Key bulunamadı!", { status: 400 });
    }

    const key = rawKey.replace(".m3u", "");

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();

    let userEntry;
    for (const user in usersData) {
        if (usersData[user].secret_key === key) {
            userEntry = usersData[user];
            break;
        }
    }

    if (!userEntry) {
        return new Response("Geçersiz token!", { status: 403 });
    }

    const currentDate = new Date();
    const expireDate = new Date(userEntry.expire_date);

    if (currentDate > expireDate) {
        return new Response("IPTV süreniz dolmuştur. Satın almak için mail atınız.", { status: 403 });
    }

    if (userEntry.used && rawKey.endsWith(".m3u")) {
        return new Response("Bu token bir cihazda kullanıldı. Lütfen satın almak için mail atınız.", { status: 403 });
    }

    if (!userEntry.used && rawKey.endsWith(".m3u")) {
        userEntry.used = true;

        // Not: Bu örnek sadece bellek üzerinde değiştiriyor, gerçek kullanımda GitHub API ya da KV Store gerekir.
    }

    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    return new Response(m3uData, {
        headers: {
            "Content-Type": "application/vnd.apple.mpegurl"
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
