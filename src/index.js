const usersUrl = "https://raw.githubusercontent.com/MDuymazz/m3u-token-secure/refs/heads/main/users.json";
const m3uLink = "https://raw.githubusercontent.com/MDuymazz/sitem3u/refs/heads/main/playlist.m3u";

async function handleRequest(request) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP");
    const key = url.searchParams.get("key");

    if (!key || !ip) {
        return new Response("IP veya key bulunamadı!", { status: 400 });
    }

    const usersResponse = await fetch(usersUrl);
    const usersData = await usersResponse.json();
    const user = usersData[ip];

    if (!user || user.secret_key !== key) {
        return new Response("Geçersiz key veya IP!", { status: 403 });
    }

    const currentDate = new Date();
    const expireDate = new Date(user.expire_date);

    if (currentDate > expireDate) {
        return new Response("Token süresi dolmuş!", { status: 403 });
    }

    const m3uResponse = await fetch(m3uLink);
    const m3uData = await m3uResponse.text();

    const htmlResponse = `
        <html>
            <head><title>Playlist</title></head>
            <body>
                <pre>${m3uData}</pre>
            </body>
        </html>
    `;

    return new Response(htmlResponse, {
        headers: {
            "Content-Type": "text/html"
        }
    });
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
