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

    // Eğer token geçerli ise, m3u dosyasının linkine yönlendirme yapıyoruz.
    const redirectUrl = `https://m3u-token-secure.mm-duymazz.workers.dev/?key=${key}.m3u`; // Sonuna ".m3u" ekliyoruz.

    return Response.redirect(redirectUrl, 302);  // 302 ile yönlendirme yapıyoruz.
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});
